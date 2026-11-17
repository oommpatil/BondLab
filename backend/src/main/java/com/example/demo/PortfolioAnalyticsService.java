package com.example.demo;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Portfolio valuation, weighted risk metrics and rate-shock scenarios.
 *
 * Every bond is priced off the supplied yield curve at its own remaining maturity
 * and coupon frequency, multiplied by the holding quantity. Bonds that have already
 * matured on the valuation date are excluded and reported separately.
 */
@Service
public class PortfolioAnalyticsService {

    public static final List<Double> STANDARD_SHOCKS_BP = List.of(-200.0, -100.0, 0.0, 100.0, 200.0);

    public record PositionResult(
            Long bondId,
            String issuer,
            double quantity,
            int remainingPeriods,
            int couponFrequency,
            double price,
            double marketValue,
            double weight,
            double yieldToMaturity,
            double modifiedDuration,
            double convexity) {
    }

    public record PortfolioMetrics(
            LocalDate valuationDate,
            double marketValue,
            double weightedYield,
            double weightedModifiedDuration,
            double weightedConvexity,
            List<PositionResult> positions,
            List<Long> excludedMaturedBondIds) {
    }

    public record ScenarioResult(
            double shockBasisPoints,
            double baseValue,
            double shockedValue,
            double valueChange,
            double valueChangePercent) {
    }

    public record ScenarioReport(
            LocalDate valuationDate,
            List<ScenarioResult> scenarios,
            List<Long> excludedMaturedBondIds) {
    }

    private record Active(Bond bond, double quantity, int periods, int frequency) {
    }

    public PortfolioMetrics calculateMetrics(
            Portfolio portfolio, YieldCurve curve, LocalDate valuationDate) {

        List<Long> excluded = new ArrayList<>();
        List<Active> actives = activeHoldings(portfolio, valuationDate, excluded);
        YieldCurve workingCurve = prepareCurve(curve);

        double[] prices = new double[actives.size()];
        double totalValue = 0.0;
        for (int i = 0; i < actives.size(); i++) {
            Active active = actives.get(i);
            prices[i] = BondMath.priceWithCurve(
                    active.bond().getFaceValue(), active.bond().getCouponRate(),
                    active.periods(), active.frequency(), workingCurve);
            totalValue += prices[i] * active.quantity();
        }

        List<PositionResult> positions = new ArrayList<>();
        double weightedYield = 0.0;
        double weightedDuration = 0.0;
        double weightedConvexity = 0.0;

        for (int i = 0; i < actives.size(); i++) {
            Active active = actives.get(i);
            Bond bond = active.bond();
            double marketValue = prices[i] * active.quantity();
            double weight = totalValue == 0.0 ? 0.0 : marketValue / totalValue;

            double ytm = BondMath.yieldToMaturity(
                    bond.getFaceValue(), bond.getCouponRate(), prices[i],
                    active.periods(), active.frequency());
            double modifiedDuration = BondMath.modifiedDuration(
                    bond.getFaceValue(), bond.getCouponRate(), ytm,
                    active.periods(), active.frequency());
            double convexity = BondMath.convexity(
                    bond.getFaceValue(), bond.getCouponRate(), ytm,
                    active.periods(), active.frequency());

            weightedYield += weight * ytm;
            weightedDuration += weight * modifiedDuration;
            weightedConvexity += weight * convexity;

            positions.add(new PositionResult(
                    bond.getId(), bond.getIssuer(), active.quantity(),
                    active.periods(), active.frequency(), prices[i],
                    marketValue, weight, ytm, modifiedDuration, convexity));
        }

        return new PortfolioMetrics(
                valuationDate, totalValue, weightedYield,
                weightedDuration, weightedConvexity, positions, excluded);
    }

    public ScenarioReport calculateScenarios(
            Portfolio portfolio, YieldCurve curve, List<Double> shocksBp, LocalDate valuationDate) {

        List<Double> shocks = shocksBp == null || shocksBp.isEmpty() ? STANDARD_SHOCKS_BP : shocksBp;

        List<Long> excluded = new ArrayList<>();
        List<Active> actives = activeHoldings(portfolio, valuationDate, excluded);
        YieldCurve workingCurve = prepareCurve(curve);
        double baseValue = value(actives, workingCurve);

        List<ScenarioResult> results = new ArrayList<>();
        for (Double shock : shocks) {
            results.add(scenario(actives, workingCurve, baseValue, shock));
        }
        return new ScenarioReport(valuationDate, results, excluded);
    }

    public ScenarioResult calculateRateShock(
            Portfolio portfolio, YieldCurve curve, double shockBp, LocalDate valuationDate,
            List<Long> excludedOut) {

        List<Active> actives = activeHoldings(portfolio, valuationDate, excludedOut);
        YieldCurve workingCurve = prepareCurve(curve);
        double baseValue = value(actives, workingCurve);
        return scenario(actives, workingCurve, baseValue, shockBp);
    }

    private ScenarioResult scenario(
            List<Active> actives, YieldCurve baseCurve, double baseValue, double shockBp) {

        if (!Double.isFinite(shockBp)) {
            throw new IllegalArgumentException("shock must be a finite number of basis points");
        }
        YieldCurve shocked = baseCurve.copy();
        shocked.shiftParallel(shockBp);
        try {
            shocked.validatePoints();
        } catch (IllegalArgumentException exception) {
            throw new IllegalArgumentException(
                    "A shock of " + shockBp + " bp makes the yield curve invalid: "
                            + exception.getMessage());
        }

        double shockedValue = value(actives, shocked);
        double change = shockedValue - baseValue;
        double changePercent = baseValue == 0.0 ? 0.0 : change / baseValue * 100.0;
        return new ScenarioResult(shockBp, baseValue, shockedValue, change, changePercent);
    }

    private double value(List<Active> actives, YieldCurve curve) {
        double total = 0.0;
        for (Active active : actives) {
            double price = BondMath.priceWithCurve(
                    active.bond().getFaceValue(), active.bond().getCouponRate(),
                    active.periods(), active.frequency(), curve);
            total += price * active.quantity();
        }
        return total;
    }

    private YieldCurve prepareCurve(YieldCurve curve) {
        if (curve == null) {
            throw new IllegalArgumentException("yieldCurve is required");
        }
        curve.validatePoints();
        return curve.copy();
    }

    private List<Active> activeHoldings(
            Portfolio portfolio, LocalDate valuationDate, List<Long> excludedOut) {

        List<Active> actives = new ArrayList<>();
        for (PortfolioHolding holding : portfolio.getHoldings()) {
            Bond bond = holding.getBond();
            int frequency = bond.getCouponFrequency();
            BondMath.requireFrequency(frequency);

            int periods = BondMath.periodsToMaturity(
                    valuationDate, bond.getMaturityDate(), frequency);
            if (periods == 0) {
                excludedOut.add(bond.getId());
                continue;
            }
            actives.add(new Active(bond, holding.getQuantity().doubleValue(), periods, frequency));
        }
        return actives;
    }
}
