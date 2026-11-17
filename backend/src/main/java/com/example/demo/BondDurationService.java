package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondDurationService {

    public double calculateMacaulayDuration(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity) {

        return calculateMacaulayDuration(faceValue, couponRate, yieldRate, yearsToMaturity, 1);
    }

    public double calculateMacaulayDuration(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.macaulayDuration(
                faceValue, couponRate, yieldRate, yearsToMaturity * frequency, frequency);
    }
}
