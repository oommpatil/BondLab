package com.example.demo;

import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
public class BondCashFlowService {

    public List<CashFlow> generateFixedCouponCashFlows(
            double faceValue,
            double couponRate,
            int yearsToMaturity) {

        return generateFixedCouponCashFlows(faceValue, couponRate, yearsToMaturity, 1);
    }

    public List<CashFlow> generateFixedCouponCashFlows(
            double faceValue,
            double couponRate,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        int periods = yearsToMaturity * frequency;
        double couponPayment = faceValue * couponRate / frequency;

        List<CashFlow> cashFlows = new ArrayList<>();
        for (int period = 1; period <= periods; period++) {
            double amount = couponPayment;
            if (period == periods) {
                amount += faceValue;
            }
            cashFlows.add(new CashFlow(period, period / (double) frequency, amount));
        }
        return cashFlows;
    }

    public List<CashFlow> generateZeroCouponCashFlows(
            double faceValue,
            int yearsToMaturity) {

        return generateZeroCouponCashFlows(faceValue, yearsToMaturity, 1);
    }

    public List<CashFlow> generateZeroCouponCashFlows(
            double faceValue,
            int yearsToMaturity,
            int frequency) {

        BondMath.requireFrequency(frequency);
        int periods = yearsToMaturity * frequency;

        List<CashFlow> cashFlows = new ArrayList<>();
        for (int period = 1; period <= periods; period++) {
            double amount = period == periods ? faceValue : 0.0;
            cashFlows.add(new CashFlow(period, period / (double) frequency, amount));
        }
        return cashFlows;
    }

    public List<CashFlow> generateFloatingRateCashFlows(
            double faceValue,
            double spread,
            double[] referenceRates) {

        return generateFloatingRateCashFlows(faceValue, spread, referenceRates, 1);
    }

    /** One reference rate (annual) per coupon period. */
    public List<CashFlow> generateFloatingRateCashFlows(
            double faceValue,
            double spread,
            double[] referenceRates,
            int frequency) {

        BondMath.requireFrequency(frequency);
        List<CashFlow> cashFlows = new ArrayList<>();

        for (int period = 1; period <= referenceRates.length; period++) {
            double couponRate = referenceRates[period - 1] + spread;
            double amount = faceValue * couponRate / frequency;
            if (period == referenceRates.length) {
                amount += faceValue;
            }
            cashFlows.add(new CashFlow(period, period / (double) frequency, amount));
        }
        return cashFlows;
    }

    public static class CashFlow {

        private final int period;
        private final double year;
        private final double amount;

        public CashFlow(int period, double year, double amount) {
            this.period = period;
            this.year = year;
            this.amount = amount;
        }

        /** Coupon period number (1-based). */
        public int getPeriod() {
            return period;
        }

        /** Time of the payment in years from today (e.g. 0.5 for the first semi-annual coupon). */
        public double getYear() {
            return year;
        }

        public double getAmount() {
            return amount;
        }
    }
}
