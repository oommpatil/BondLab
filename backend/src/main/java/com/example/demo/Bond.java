package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

@Entity
public class Bond {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Positive(message = "faceValue must be greater than 0")
    private double faceValue;

    @DecimalMin(value = "0.0", message = "couponRate must be at least 0")
    @DecimalMax(value = "1.0", message = "couponRate must be a fraction at most 1 (use 0.0679 for 6.79%)")
    private double couponRate;

    @NotNull(message = "maturityDate is required")
    private LocalDate maturityDate;

    @NotBlank(message = "issuer is required")
    private String issuer;

    // Nullable so rows created before these columns existed stay readable.
    @Enumerated(EnumType.STRING)
    private BondType bondType;

    private Integer couponFrequency;

    public Bond() {
    }

    public Long getId() {
        return id;
    }

    public double getFaceValue() {
        return faceValue;
    }

    public void setFaceValue(double faceValue) {
        this.faceValue = faceValue;
    }

    public double getCouponRate() {
        return couponRate;
    }

    public void setCouponRate(double couponRate) {
        this.couponRate = couponRate;
    }

    public LocalDate getMaturityDate() {
        return maturityDate;
    }

    public void setMaturityDate(LocalDate maturityDate) {
        this.maturityDate = maturityDate;
    }

    public String getIssuer() {
        return issuer;
    }

    public void setIssuer(String issuer) {
        this.issuer = issuer;
    }

    public BondType getBondType() {
        return bondType;
    }

    public void setBondType(BondType bondType) {
        this.bondType = bondType;
    }

    /** Coupons per year; a missing value means annual. */
    public Integer getCouponFrequency() {
        return couponFrequency == null ? Integer.valueOf(1) : couponFrequency;
    }

    public void setCouponFrequency(Integer couponFrequency) {
        this.couponFrequency = couponFrequency;
    }
}
