package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondYtmService {

    public double calculateYtm(
            double faceValue,
            double couponRate,
            double marketPrice,
            int yearsToMaturity) {

        return calculateYtm(faceValue, couponRate, marketPrice, yearsToMaturity, 1);
    }

    public double calculateYtm(
            double faceValue,
            double couponRate,
            double marketPrice,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        return BondMath.yieldToMaturity(
                faceValue, couponRate, marketPrice, yearsToMaturity * frequency, frequency);
    }
}
