package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondPricingService {

    public double calculatePrice(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity) {

        return calculatePrice(faceValue, couponRate, yieldRate, yearsToMaturity, 1);
    }

    public double calculatePrice(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.price(
                faceValue, couponRate, yieldRate, yearsToMaturity * frequency, frequency);
    }

    public double calculatePriceUsingCurve(
            double faceValue,
            double couponRate,
            int yearsToMaturity,
            YieldCurve yieldCurve) {

        return calculatePriceUsingCurve(faceValue, couponRate, yearsToMaturity, yieldCurve, 1);
    }

    public double calculatePriceUsingCurve(
            double faceValue,
            double couponRate,
            int yearsToMaturity,
            YieldCurve yieldCurve,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.priceWithCurve(
                faceValue, couponRate, yearsToMaturity * frequency, frequency, yieldCurve);
    }
}
