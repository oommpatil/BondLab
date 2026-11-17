package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondConvexityService {

    public double calculateConvexity(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity) {

        return calculateConvexity(faceValue, couponRate, yieldRate, yearsToMaturity, 1);
    }

    public double calculateConvexity(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.convexity(
                faceValue, couponRate, yieldRate, yearsToMaturity * frequency, frequency);
    }
}
