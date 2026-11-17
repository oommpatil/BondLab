package com.example.demo;

import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PortfolioAnalyticsServiceTest {

    private static final LocalDate TODAY = LocalDate.of(2026, 11, 12);
    private final PortfolioAnalyticsService service = new PortfolioAnalyticsService();

    private static YieldCurve flatCurve(double rate) {
        YieldCurve curve = new YieldCurve();
        for (double tenor : new double[] {0.5, 1, 2, 5, 10, 20}) {
            YieldCurvePoint point = new YieldCurvePoint();
            point.setTenor(tenor);
            point.setInterestRate(rate);
            curve.getPoints().add(point);
        }
        return curve;
    }

    private static Bond bond(String issuer, double coupon, LocalDate maturity, int frequency) {
        Bond bond = new Bond();
        bond.setIssuer(issuer);
        bond.setFaceValue(1000);
        bond.setCouponRate(coupon);
        bond.setMaturityDate(maturity);
        bond.setCouponFrequency(frequency);
        return bond;
    }

    private static Portfolio portfolio(Object... bondAndQuantity) {
        Portfolio portfolio = new Portfolio();
        List<PortfolioHolding> holdings = new ArrayList<>();
        for (int i = 0; i < bondAndQuantity.length; i += 2) {
            PortfolioHolding holding = new PortfolioHolding();
            holding.setPortfolio(portfolio);
            holding.setBond((Bond) bondAndQuantity[i]);
            holding.setQuantity(BigDecimal.valueOf((Integer) bondAndQuantity[i + 1]));
            holdings.add(holding);
        }
        portfolio.setHoldings(holdings);
        return portfolio;
    }

    @Test
    void quantityScalesMarketValueLinearly() {
        Bond bond = bond("A", 0.07, LocalDate.of(2031, 11, 12), 2);
        double one = service.calculateMetrics(portfolio(bond, 1), flatCurve(0.06), TODAY).marketValue();
        double three = service.calculateMetrics(portfolio(bond, 3), flatCurve(0.06), TODAY).marketValue();
        assertEquals(3 * one, three, 1e-8);
    }

    @Test
    void flatCurveGivesWeightedYieldEqualToCurveRate() {
        Portfolio portfolio = portfolio(
                bond("A", 0.07, LocalDate.of(2031, 11, 12), 2), 2,
                bond("B", 0.05, LocalDate.of(2036, 11, 12), 2), 1);
        PortfolioAnalyticsService.PortfolioMetrics metrics =
                service.calculateMetrics(portfolio, flatCurve(0.06), TODAY);

        assertEquals(0.06, metrics.weightedYield(), 1e-8);
        assertTrue(metrics.weightedModifiedDuration() > 0);
        assertTrue(metrics.weightedConvexity() > 0);

        double weights = metrics.positions().stream()
                .mapToDouble(PortfolioAnalyticsService.PositionResult::weight).sum();
        assertEquals(1.0, weights, 1e-12);
    }

    @Test
    void weightedDurationLiesBetweenIndividualDurations() {
        Portfolio portfolio = portfolio(
                bond("Short", 0.07, LocalDate.of(2028, 11, 12), 2), 1,
                bond("Long", 0.07, LocalDate.of(2041, 11, 12), 2), 1);
        PortfolioAnalyticsService.PortfolioMetrics metrics =
                service.calculateMetrics(portfolio, flatCurve(0.06), TODAY);
        double d1 = metrics.positions().get(0).modifiedDuration();
        double d2 = metrics.positions().get(1).modifiedDuration();
        assertTrue(metrics.weightedModifiedDuration() > Math.min(d1, d2));
        assertTrue(metrics.weightedModifiedDuration() < Math.max(d1, d2));
    }

    @Test
    void standardScenariosAreOrderedAndConvex() {
        Portfolio portfolio = portfolio(bond("A", 0.07, LocalDate.of(2036, 11, 12), 2), 5);
        PortfolioAnalyticsService.ScenarioReport report =
                service.calculateScenarios(portfolio, flatCurve(0.07), null, TODAY);

        assertEquals(5, report.scenarios().size());
        var s = report.scenarios();
        assertEquals(-200.0, s.get(0).shockBasisPoints());
        assertEquals(0.0, s.get(2).valueChange(), 1e-9);
        assertTrue(s.get(0).valueChange() > 0);    // yields down -> value up
        assertTrue(s.get(4).valueChange() < 0);    // yields up   -> value down
        assertTrue(s.get(1).valueChange() > -s.get(3).valueChange()); // convexity: gain > loss
    }

    @Test
    void maturedBondsAreExcludedNotPriced() {
        Portfolio portfolio = portfolio(
                bond("Live", 0.07, LocalDate.of(2031, 11, 12), 2), 1,
                bond("Matured", 0.07, LocalDate.of(2026, 1, 1), 2), 1);
        PortfolioAnalyticsService.PortfolioMetrics metrics =
                service.calculateMetrics(portfolio, flatCurve(0.06), TODAY);
        assertEquals(1, metrics.positions().size());
        assertEquals(1, metrics.excludedMaturedBondIds().size());
    }

    @Test
    void shockThatBreaksTheCurveIsRejected() {
        Portfolio portfolio = portfolio(bond("A", 0.07, LocalDate.of(2031, 11, 12), 2), 1);
        assertThrows(IllegalArgumentException.class,
                () -> service.calculateScenarios(portfolio, flatCurve(0.01), List.of(-20000.0), TODAY));
    }

    @Test
    void curveShorterThanLongestBondIsRejected() {
        Portfolio portfolio = portfolio(bond("Long", 0.07, LocalDate.of(2056, 11, 12), 2), 1);
        assertThrows(IllegalArgumentException.class,
                () -> service.calculateMetrics(portfolio, flatCurve(0.06), TODAY));
    }

    @Test
    void emptyPortfolioValuesToZero() {
        PortfolioAnalyticsService.PortfolioMetrics metrics =
                service.calculateMetrics(new Portfolio(), flatCurve(0.06), TODAY);
        assertEquals(0.0, metrics.marketValue(), 0.0);
        assertEquals(0, metrics.positions().size());
    }
}
