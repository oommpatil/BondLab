package com.example.demo;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

@Entity
public class YieldCurvePoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private double tenor;
    private double interestRate;

    public YieldCurvePoint() {
    }

    public Long getId() {
        return id;
    }

    public double getTenor() {
        return tenor;
    }

    public void setTenor(double tenor) {
        this.tenor = tenor;
    }

    public double getInterestRate() {
        return interestRate;
    }

    public void setInterestRate(double interestRate) {
        this.interestRate = interestRate;
    }
}