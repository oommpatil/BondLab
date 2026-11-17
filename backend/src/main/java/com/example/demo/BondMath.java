package com.example.demo;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Pure, framework-free bond mathematics.
 *
 * Conventions:
 *  - A bond pays {@code frequency} coupons per year (1 = annual, 2 = semi-annual, ...).
 *  - {@code periods} is the number of remaining coupon periods (years x frequency).
 *  - Yields and curve rates are annual nominal rates compounded {@code frequency}
 *    times per year (bond-equivalent convention). With frequency = 1 this is the
 *    plain annual-compounding formula used before semi-annual support was added.
 *  - Durations are expressed in years, convexity in years squared.
 */
public final class BondMath {

    private static final int[] ALLOWED_FREQUENCIES = {1, 2, 4, 12};

    private BondMath() {
    }

    public static void requireFrequency(int frequency) {
        for (int allowed : ALLOWED_FREQUENCIES) {
            if (allowed == frequency) {
                return;
            }
        }
        throw new IllegalArgumentException("frequency must be one of 1, 2, 4 or 12");
    }

    private static void requireInputs(double faceValue, double couponRate, int periods, int frequency) {
        requireFrequency(frequency);
        if (!Double.isFinite(faceValue) || faceValue <= 0.0) {
            throw new IllegalArgumentException("faceValue must be greater than 0");
        }
        if (!Double.isFinite(couponRate) || couponRate < 0.0) {
            throw new IllegalArgumentException("couponRate must be at least 0");
        }
        if (periods <= 0) {
            throw new IllegalArgumentException("yearsToMaturity must be greater than 0");
        }
    }

    private static double periodRate(double annualRate, int frequency) {
        if (!Double.isFinite(annualRate)) {
            throw new IllegalArgumentException("yieldRate must be finite");
        }
        double periodRate = annualRate / frequency;
        if (periodRate <= -1.0) {
            throw new IllegalArgumentException("yieldRate must be greater than -1");
        }
        return periodRate;
    }

    /** Price from a flat yield. */
    public static double price(
            double faceValue, double couponRate, double yieldRate, int periods, int frequency) {

        requireInputs(faceValue, couponRate, periods, frequency);
        double rate = periodRate(yieldRate, frequency);
        double coupon = faceValue * couponRate / frequency;

        double price = 0.0;
        for (int k = 1; k <= periods; k++) {
            double cashFlow = coupon + (k == periods ? faceValue : 0.0);
            price += cashFlow / Math.pow(1 + rate, k);
        }
        return price;
    }

    /** Price by discounting each cash flow at the curve rate for its own tenor. */
    public static double priceWithCurve(
            double faceValue, double couponRate, int periods, int frequency, YieldCurve curve) {

        requireInputs(faceValue, couponRate, periods, frequency);
        if (curve == null) {
            throw new IllegalArgumentException("yieldCurve is required");
        }
        curve.validateForPricing(periods / (double) frequency);

        double coupon = faceValue * couponRate / frequency;
        double price = 0.0;
        for (int k = 1; k <= periods; k++) {
            double years = k / (double) frequency;
            double rate = periodRate(curve.getRateAtTenor(years), frequency);
            double cashFlow = coupon + (k == periods ? faceValue : 0.0);
            price += cashFlow / Math.pow(1 + rate, k);
        }
        return price;
    }

    public static double macaulayDuration(
            double faceValue, double couponRate, double yieldRate, int periods, int frequency) {

        requireInputs(faceValue, couponRate, periods, frequency);
        double rate = periodRate(yieldRate, frequency);
        double coupon = faceValue * couponRate / frequency;

        double price = 0.0;
        double weighted = 0.0;
        for (int k = 1; k <= periods; k++) {
            double cashFlow = coupon + (k == periods ? faceValue : 0.0);
            double presentValue = cashFlow / Math.pow(1 + rate, k);
            price += presentValue;
            weighted += (k / (double) frequency) * presentValue;
        }
        return weighted / price;
    }

    public static double modifiedDuration(
            double faceValue, double couponRate, double yieldRate, int periods, int frequency) {

        double macaulay = macaulayDuration(faceValue, couponRate, yieldRate, periods, frequency);
        return macaulay / (1 + yieldRate / frequency);
    }

    public static double convexity(
            double faceValue, double couponRate, double yieldRate, int periods, int frequency) {

        requireInputs(faceValue, couponRate, periods, frequency);
        double rate = periodRate(yieldRate, frequency);
        double coupon = faceValue * couponRate / frequency;

        double price = 0.0;
        double numerator = 0.0;
        for (int k = 1; k <= periods; k++) {
            double cashFlow = coupon + (k == periods ? faceValue : 0.0);
            price += cashFlow / Math.pow(1 + rate, k);
            numerator += k * (k + 1.0) * cashFlow / Math.pow(1 + rate, k + 2);
        }
        return numerator / (price * frequency * frequency);
    }

    /**
     * Yield to maturity by bracketing + bisection. Price is strictly decreasing in
     * yield, so a root is guaranteed once the target price is bracketed; unlike a
     * bare Newton-Raphson loop this cannot diverge or silently return a bad guess.
     */
    public static double yieldToMaturity(
            double faceValue, double couponRate, double marketPrice, int periods, int frequency) {

        requireInputs(faceValue, couponRate, periods, frequency);
        if (!Double.isFinite(marketPrice) || marketPrice <= 0.0) {
            throw new IllegalArgumentException("marketPrice must be greater than 0");
        }

        double low = -0.99;
        double high = 1.0;

        if (price(faceValue, couponRate, low, periods, frequency) < marketPrice) {
            throw new IllegalArgumentException(
                    "marketPrice is too high: no yield above -99% reproduces it");
        }

        int expansions = 0;
        while (price(faceValue, couponRate, high, periods, frequency) > marketPrice) {
            high *= 2;
            if (++expansions > 20) {
                throw new IllegalArgumentException(
                        "marketPrice is too low: yield did not converge");
            }
        }

        for (int i = 0; i < 200 && (high - low) > 1e-13; i++) {
            double mid = (low + high) / 2;
            if (price(faceValue, couponRate, mid, periods, frequency) > marketPrice) {
                low = mid;
            } else {
                high = mid;
            }
        }
        return (low + high) / 2;
    }

    /**
     * Remaining coupon periods between two dates, rounded to the nearest period.
     * Returns 0 for a bond that has already matured; otherwise at least 1.
     */
    public static int periodsToMaturity(LocalDate valuationDate, LocalDate maturityDate, int frequency) {
        requireFrequency(frequency);
        long days = ChronoUnit.DAYS.between(valuationDate, maturityDate);
        if (days <= 0) {
            return 0;
        }
        long periods = Math.round(days / 365.25 * frequency);
        return (int) Math.max(1, periods);
    }
}
