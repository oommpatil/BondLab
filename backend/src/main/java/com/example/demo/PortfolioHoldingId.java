package com.example.demo;

import java.io.Serializable;
import java.util.Objects;

public class PortfolioHoldingId implements Serializable {

    private Long portfolio;
    private Long bond;

    public PortfolioHoldingId() {
    }

    public PortfolioHoldingId(Long portfolio, Long bond) {
        this.portfolio = portfolio;
        this.bond = bond;
    }

    @Override
    public boolean equals(Object other) {
        if (this == other) {
            return true;
        }
        if (!(other instanceof PortfolioHoldingId that)) {
            return false;
        }
        return Objects.equals(portfolio, that.portfolio)
                && Objects.equals(bond, that.bond);
    }

    @Override
    public int hashCode() {
        return Objects.hash(portfolio, bond);
    }
}
