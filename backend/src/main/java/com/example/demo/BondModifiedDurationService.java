package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondModifiedDurationService {

    public double calculateModifiedDuration(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity) {

        return calculateModifiedDuration(faceValue, couponRate, yieldRate, yearsToMaturity, 1);
    }

    public double calculateModifiedDuration(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.modifiedDuration(
                faceValue, couponRate, yieldRate, yearsToMaturity * frequency, frequency);
    }
}
