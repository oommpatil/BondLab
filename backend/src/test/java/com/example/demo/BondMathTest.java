package com.example.demo;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BondMathTest {

    private static final double EPS = 1e-9;

    private static YieldCurve flatCurve(double rate, double... tenors) {
        YieldCurve curve = new YieldCurve();
        for (double tenor : tenors) {
            YieldCurvePoint point = new YieldCurvePoint();
            point.setTenor(tenor);
            point.setInterestRate(rate);
            curve.getPoints().add(point);
        }
        return curve;
    }

    @Test
    void annualParBondPricesAtFaceValue() {
        assertEquals(1000.0, BondMath.price(1000, 0.07, 0.07, 5, 1), 1e-8);
    }

    @Test
    void semiAnnualParBondPricesAtFaceValue() {
        assertEquals(1000.0, BondMath.price(1000, 0.08, 0.08, 10, 2), 1e-8);
    }

    @Test
    void priceFallsWhenYieldRisesAndPremiumDiscountSideIsCorrect() {
        double atPar = BondMath.price(1000, 0.06, 0.06, 5, 1);
        assertTrue(BondMath.price(1000, 0.06, 0.05, 5, 1) > atPar);   // premium
        assertTrue(BondMath.price(1000, 0.06, 0.07, 5, 1) < atPar);   // discount
    }

    @Test
    void knownAnnualPrice() {
        // 5y, 5% annual coupon, 6% yield, face 100 -> 95.7876...
        assertEquals(95.78763, BondMath.price(100, 0.05, 0.06, 5, 1), 1e-4);
    }

    @Test
    void ytmRoundTripsAnnual() {
        double price = BondMath.price(10_000, 0.0717, 0.0725, 7, 1);
        assertEquals(0.0725, BondMath.yieldToMaturity(10_000, 0.0717, price, 7, 1), 1e-9);
    }

    @Test
    void ytmRoundTripsSemiAnnual() {
        double price = BondMath.price(10_000, 0.0726, 0.0691, 20, 2);
        assertEquals(0.0691, BondMath.yieldToMaturity(10_000, 0.0726, price, 20, 2), 1e-9);
    }

    @Test
    void ytmOfParBondEqualsCoupon() {
        assertEquals(0.08, BondMath.yieldToMaturity(1000, 0.08, 1000, 10, 2), 1e-9);
    }

    @Test
    void ytmHandlesZeroCouponAndDeepDiscount() {
        double price = BondMath.price(1000, 0.0, 0.12, 30, 1);
        assertEquals(0.12, BondMath.yieldToMaturity(1000, 0.0, price, 30, 1), 1e-9);
    }

    @Test
    void ytmRejectsBadPrices() {
        assertThrows(IllegalArgumentException.class,
                () -> BondMath.yieldToMaturity(1000, 0.05, 0.0, 5, 1));
        assertThrows(IllegalArgumentException.class,
                () -> BondMath.yieldToMaturity(1000, 0.05, Double.NaN, 5, 1));
        assertThrows(IllegalArgumentException.class,
                () -> BondMath.yieldToMaturity(1000, 0.05, -5, 5, 1));
    }

    @Test
    void zeroCouponMacaulayDurationEqualsMaturity() {
        assertEquals(7.0, BondMath.macaulayDuration(1000, 0.0, 0.05, 7, 1), EPS);
        assertEquals(3.0, BondMath.macaulayDuration(1000, 0.0, 0.05, 6, 2), EPS);
    }

    @Test
    void couponBondDurationIsBelowMaturity() {
        double duration = BondMath.macaulayDuration(1000, 0.07, 0.07, 10, 1);
        assertTrue(duration > 0 && duration < 10);
    }

    @Test
    void modifiedDurationIsMacaulayOverOnePlusPeriodYield() {
        double macaulay = BondMath.macaulayDuration(1000, 0.07, 0.06, 10, 2);
        assertEquals(macaulay / 1.03, BondMath.modifiedDuration(1000, 0.07, 0.06, 10, 2), EPS);
    }

    @Test
    void durationConvexityApproximationMatchesRepricing() {
        double face = 1000;
        double coupon = 0.07;
        double yield = 0.06;
        for (int frequency : new int[] {1, 2}) {
            int periods = 10 * frequency;
            double price = BondMath.price(face, coupon, yield, periods, frequency);
            double duration = BondMath.modifiedDuration(face, coupon, yield, periods, frequency);
            double convexity = BondMath.convexity(face, coupon, yield, periods, frequency);
            assertTrue(convexity > 0);

            double dy = 0.001; // small move: the neglected 3rd-order term is ~1e-7 of price
            double estimate = price * (1 - duration * dy + 0.5 * convexity * dy * dy);
            double actual = BondMath.price(face, coupon, yield + dy, periods, frequency);
            assertEquals(actual, estimate, actual * 1e-6);
        }
    }

    @Test
    void invalidFrequencyAndInputsAreRejected() {
        assertThrows(IllegalArgumentException.class, () -> BondMath.price(1000, 0.05, 0.05, 5, 3));
        assertThrows(IllegalArgumentException.class, () -> BondMath.price(-1, 0.05, 0.05, 5, 1));
        assertThrows(IllegalArgumentException.class, () -> BondMath.price(1000, -0.05, 0.05, 5, 1));
        assertThrows(IllegalArgumentException.class, () -> BondMath.price(1000, 0.05, -1.5, 5, 1));
        assertThrows(IllegalArgumentException.class, () -> BondMath.price(1000, 0.05, 0.05, 0, 1));
    }

    @Test
    void flatCurvePricingMatchesFlatYieldPricing() {
        YieldCurve curve = flatCurve(0.065, 0.5, 1, 2, 5, 10);
        assertEquals(
                BondMath.price(1000, 0.07, 0.065, 10, 2),
                BondMath.priceWithCurve(1000, 0.07, 10, 2, curve),
                1e-8);
    }

    @Test
    void curveMustCoverBondMaturity() {
        YieldCurve curve = flatCurve(0.06, 1, 2, 3);
        assertThrows(IllegalArgumentException.class,
                () -> BondMath.priceWithCurve(1000, 0.07, 5, 1, curve));
    }

    @Test
    void periodsToMaturity() {
        LocalDate today = LocalDate.of(2026, 11, 12);
        assertEquals(2, BondMath.periodsToMaturity(today, LocalDate.of(2027, 11, 12), 2));
        assertEquals(1, BondMath.periodsToMaturity(today, LocalDate.of(2026, 11, 20), 2)); // at least 1
        assertEquals(0, BondMath.periodsToMaturity(today, LocalDate.of(2026, 11, 12), 2)); // matured
        assertEquals(0, BondMath.periodsToMaturity(today, LocalDate.of(2025, 1, 1), 1));
        assertEquals(10, BondMath.periodsToMaturity(today, LocalDate.of(2036, 11, 12), 1));
    }
}
