package com.example.demo;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotSame;
import static org.junit.jupiter.api.Assertions.assertThrows;

class YieldCurveTest {

    private static YieldCurve curve(double... tenorRatePairs) {
        YieldCurve curve = new YieldCurve();
        for (int i = 0; i < tenorRatePairs.length; i += 2) {
            YieldCurvePoint point = new YieldCurvePoint();
            point.setTenor(tenorRatePairs[i]);
            point.setInterestRate(tenorRatePairs[i + 1]);
            curve.getPoints().add(point);
        }
        return curve;
    }

    @Test
    void interpolatesLinearlyBetweenPoints() {
        YieldCurve curve = curve(1, 0.06, 3, 0.08);
        assertEquals(0.07, curve.getRateAtTenor(2), 1e-12);
        assertEquals(0.06, curve.getRateAtTenor(1), 1e-12);
        assertEquals(0.08, curve.getRateAtTenor(3), 1e-12);
    }

    @Test
    void holdsFirstRateFlatBelowShortestTenorAndRejectsBeyondLongest() {
        YieldCurve curve = curve(1, 0.06, 3, 0.08);
        assertEquals(0.06, curve.getRateAtTenor(0.5), 1e-12);
        assertThrows(IllegalArgumentException.class, () -> curve.getRateAtTenor(4));
    }

    @Test
    void parallelShiftMovesEveryPoint() {
        YieldCurve curve = curve(1, 0.06, 3, 0.08);
        curve.shiftParallel(100);
        assertEquals(0.07, curve.getPoints().get(0).getInterestRate(), 1e-12);
        assertEquals(0.09, curve.getPoints().get(1).getInterestRate(), 1e-12);
    }

    @Test
    void steepenRaisesLongEndAndLowersShortEnd() {
        YieldCurve curve = curve(1, 0.06, 5.5, 0.07, 10, 0.08);
        curve.steepenOrFlatten(50);
        assertEquals(0.055, curve.getRateAtTenor(1), 1e-12);
        assertEquals(0.07, curve.getRateAtTenor(5.5), 1e-12);
        assertEquals(0.085, curve.getRateAtTenor(10), 1e-12);
    }

    @Test
    void validationRejectsBadCurves() {
        assertThrows(IllegalArgumentException.class, () -> new YieldCurve().validatePoints());
        assertThrows(IllegalArgumentException.class, () -> curve(1, 0.06, 1, 0.07).validatePoints());
        assertThrows(IllegalArgumentException.class, () -> curve(0, 0.06).validatePoints());
        assertThrows(IllegalArgumentException.class, () -> curve(1, -1.0).validatePoints());
    }

    @Test
    void copyIsIndependent() {
        YieldCurve original = curve(1, 0.06, 3, 0.08);
        YieldCurve copy = original.copy();
        copy.shiftParallel(100);
        assertNotSame(original.getPoints().get(0), copy.getPoints().get(0));
        assertEquals(0.06, original.getPoints().get(0).getInterestRate(), 1e-12);
    }
}
