package com.example.demo;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
public class YieldCurve {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String name;

    @OneToMany(cascade = CascadeType.ALL, orphanRemoval = true)
    private List<YieldCurvePoint> points = new ArrayList<>();

    public YieldCurve() {
    }

    public Long getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public List<YieldCurvePoint> getPoints() {
        return points;
    }

    public void setPoints(List<YieldCurvePoint> points) {
        this.points = points;
    }

    public void validatePoints() {
        if (points == null || points.isEmpty()) {
            throw new IllegalArgumentException(
                    "yieldCurve must contain at least one point"
            );
        }

        Set<Double> tenors = new HashSet<>();
        for (YieldCurvePoint point : points) {
            if (point == null) {
                throw new IllegalArgumentException(
                        "yieldCurve points cannot contain null entries"
                );
            }

            double tenor = point.getTenor();
            double rate = point.getInterestRate();
            if (!Double.isFinite(tenor) || tenor <= 0.0) {
                throw new IllegalArgumentException(
                        "yieldCurve tenors must be finite and greater than 0"
                );
            }
            if (!Double.isFinite(rate) || rate <= -1.0) {
                throw new IllegalArgumentException(
                        "yieldCurve rates must be finite and greater than -1"
                );
            }
            if (!tenors.add(tenor)) {
                throw new IllegalArgumentException(
                        "yieldCurve tenors must be unique"
                );
            }
        }
    }

    public void validateForPricing(int yearsToMaturity) {
        validateForPricing((double) yearsToMaturity);
    }

    /** The curve must reach at least the bond's remaining maturity (in years). */
    public void validateForPricing(double maturityYears) {
        validatePoints();
        double longestTenor = points.stream()
                .mapToDouble(YieldCurvePoint::getTenor)
                .max()
                .orElseThrow();

        if (longestTenor < maturityYears - 1e-9) {
            throw new IllegalArgumentException(
                    "yieldCurve must extend to at least the bond's remaining maturity ("
                            + maturityYears + " years)"
            );
        }
    }

    /** Independent, unsaved copy, so shocks never touch a stored curve. */
    public YieldCurve copy() {
        YieldCurve copy = new YieldCurve();
        copy.name = name;
        if (points != null) {
            for (YieldCurvePoint point : points) {
                YieldCurvePoint pointCopy = new YieldCurvePoint();
                pointCopy.setTenor(point.getTenor());
                pointCopy.setInterestRate(point.getInterestRate());
                copy.points.add(pointCopy);
            }
        }
        return copy;
    }

    public double getRateAtTenor(double tenor) {
        points.sort(Comparator.comparingDouble(YieldCurvePoint::getTenor));

        if (points.isEmpty()) {
            throw new IllegalStateException("The yield curve has no points");
        }

        for (YieldCurvePoint point : points) {
            if (point.getTenor() == tenor) {
                return point.getInterestRate();
            }
        }

        // Below the shortest tenor: hold the first rate flat.
        if (tenor < points.get(0).getTenor()) {
            return points.get(0).getInterestRate();
        }

        for (int i = 0; i < points.size() - 1; i++) {
            YieldCurvePoint lower = points.get(i);
            YieldCurvePoint upper = points.get(i + 1);

            if (tenor > lower.getTenor() && tenor < upper.getTenor()) {
                double fraction = (tenor - lower.getTenor())
                        / (upper.getTenor() - lower.getTenor());

                return lower.getInterestRate()
                        + fraction * (upper.getInterestRate() - lower.getInterestRate());
            }
        }

        throw new IllegalArgumentException("Tenor is outside the curve range");
    }

    public void shiftParallel(double basisPoints) {
        double rateChange = basisPoints / 10_000.0;

        for (YieldCurvePoint point : points) {
            point.setInterestRate(point.getInterestRate() + rateChange);
        }
    }

    public void steepenOrFlatten(double basisPoints) {
        if (points.size() < 2) {
            throw new IllegalStateException(
                    "At least two yield curve points are required"
            );
        }

        points.sort(Comparator.comparingDouble(YieldCurvePoint::getTenor));

        double shortestTenor = points.get(0).getTenor();
        double longestTenor = points.get(points.size() - 1).getTenor();

        if (shortestTenor == longestTenor) {
            throw new IllegalStateException(
                    "Yield curve points must have different tenors"
            );
        }

        for (YieldCurvePoint point : points) {
            double position = (point.getTenor() - shortestTenor)
                    / (longestTenor - shortestTenor);

            double rateChange = ((2 * position) - 1)
                    * basisPoints / 10_000.0;

            point.setInterestRate(point.getInterestRate() + rateChange);
        }
    }
}