package com.example.demo;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class BondValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    private static Bond validBond() {
        Bond bond = new Bond();
        bond.setIssuer("Government of India - 7.10% GS 2029");
        bond.setFaceValue(10_000);
        bond.setCouponRate(0.071);
        bond.setMaturityDate(LocalDate.of(2029, 4, 18));
        return bond;
    }

    @Test
    void validBondPasses() {
        assertTrue(validator.validate(validBond()).isEmpty());
    }

    @Test
    void rejectsNonPositiveFaceValue() {
        Bond bond = validBond();
        bond.setFaceValue(0);
        assertEquals(1, validator.validate(bond).size());
    }

    @Test
    void rejectsCouponGivenAsPercentInsteadOfFraction() {
        Bond bond = validBond();
        bond.setCouponRate(7.1);
        assertEquals(1, validator.validate(bond).size());
    }

    @Test
    void rejectsNegativeCoupon() {
        Bond bond = validBond();
        bond.setCouponRate(-0.01);
        assertEquals(1, validator.validate(bond).size());
    }

    @Test
    void rejectsMissingMaturityAndBlankIssuer() {
        Bond bond = validBond();
        bond.setMaturityDate(null);
        bond.setIssuer("  ");
        assertEquals(2, validator.validate(bond).size());
    }
}
