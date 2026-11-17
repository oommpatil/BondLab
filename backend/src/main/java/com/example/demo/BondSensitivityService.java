package com.example.demo;

import org.springframework.stereotype.Service;

@Service
public class BondSensitivityService {

    private final BondPricingService bondPricingService;
    private final BondModifiedDurationService bondModifiedDurationService;
    private final BondConvexityService bondConvexityService;

    public BondSensitivityService(
            BondPricingService bondPricingService,
            BondModifiedDurationService bondModifiedDurationService,
            BondConvexityService bondConvexityService) {

        this.bondPricingService = bondPricingService;
        this.bondModifiedDurationService = bondModifiedDurationService;
        this.bondConvexityService = bondConvexityService;
    }

    public SensitivityResult calculateSensitivity(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            double yieldChange) {

        return calculateSensitivity(
                faceValue, couponRate, yieldRate, yearsToMaturity, yieldChange, 1);
    }

    public SensitivityResult calculateSensitivity(
            double faceValue,
            double couponRate,
            double yieldRate,
            int yearsToMaturity,
            double yieldChange,
            int frequency) {

        double originalPrice =
                bondPricingService.calculatePrice(
                        faceValue,
                        couponRate,
                        yieldRate,
                        yearsToMaturity,
                        frequency
                );

        double modifiedDuration =
                bondModifiedDurationService.calculateModifiedDuration(
                        faceValue,
                        couponRate,
                        yieldRate,
                        yearsToMaturity,
                        frequency
                );

        double convexity =
                bondConvexityService.calculateConvexity(
                        faceValue,
                        couponRate,
                        yieldRate,
                        yearsToMaturity,
                        frequency
                );

        // Duration + convexity approximation
        double percentageChange =
                (-modifiedDuration * yieldChange)
                        + (0.5 * convexity * yieldChange * yieldChange);

        double estimatedPrice =
                originalPrice * (1 + percentageChange);

        return new SensitivityResult(
                originalPrice,
                yieldChange,
                modifiedDuration,
                convexity,
                percentageChange,
                estimatedPrice
        );
    }

    public static class SensitivityResult {

        private final double originalPrice;
        private final double yieldChange;
        private final double modifiedDuration;
        private final double convexity;
        private final double estimatedPercentageChange;
        private final double estimatedPrice;

        public SensitivityResult(
                double originalPrice,
                double yieldChange,
                double modifiedDuration,
                double convexity,
                double estimatedPercentageChange,
                double estimatedPrice) {

            this.originalPrice = originalPrice;
            this.yieldChange = yieldChange;
            this.modifiedDuration = modifiedDuration;
            this.convexity = convexity;
            this.estimatedPercentageChange = estimatedPercentageChange;
            this.estimatedPrice = estimatedPrice;
        }

        public double getOriginalPrice() {
            return originalPrice;
        }

        public double getYieldChange() {
            return yieldChange;
        }

        public double getModifiedDuration() {
            return modifiedDuration;
        }

        public double getConvexity() {
            return convexity;
        }

        public double getEstimatedPercentageChange() {
            return estimatedPercentageChange;
        }

        public double getEstimatedPrice() {
            return estimatedPrice;
        }
    }
}