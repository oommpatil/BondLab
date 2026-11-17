package com.example.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Positive;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.validation.annotation.Validated;

import java.util.List;

@Tag(name = "Bonds")
@RestController
@Validated
@RequestMapping("/bonds")
public class BondController {

    private final BondRepository bondRepository;
    private final BondPricingService bondPricingService;
    private final BondYtmService bondYtmService;
    private final BondDurationService bondDurationService;
    private final BondModifiedDurationService bondModifiedDurationService;
    private final BondConvexityService bondConvexityService;
    private final BondSensitivityService bondSensitivityService;
    private final BondCashFlowService bondCashFlowService;

    public BondController(
            BondRepository bondRepository,
            BondPricingService bondPricingService,
            BondYtmService bondYtmService,
            BondDurationService bondDurationService,
            BondModifiedDurationService bondModifiedDurationService,
            BondConvexityService bondConvexityService,
            BondSensitivityService bondSensitivityService,
            BondCashFlowService bondCashFlowService) {
        this.bondRepository = bondRepository;
        this.bondPricingService = bondPricingService;
        this.bondYtmService = bondYtmService;
        this.bondDurationService = bondDurationService;
        this.bondModifiedDurationService = bondModifiedDurationService;
        this.bondConvexityService = bondConvexityService;
        this.bondSensitivityService = bondSensitivityService;
        this.bondCashFlowService = bondCashFlowService;
    }

    @Operation(summary = "Create a bond (couponRate is a fraction, e.g. 0.0679 for 6.79%)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Bond createBond(@Valid @RequestBody Bond bond) {
        Bond newBond = new Bond();
        copyFields(bond, newBond);
        return bondRepository.save(newBond);
    }

    @GetMapping
    public List<Bond> getAllBonds() {
        return bondRepository.findAll();
    }

    @GetMapping("/{id}")
    public Bond getBond(@PathVariable Long id) {
        return findBond(id);
    }

    @PutMapping("/{id}")
    public Bond updateBond(@PathVariable Long id, @Valid @RequestBody Bond updatedBond) {
        Bond bond = findBond(id);
        copyFields(updatedBond, bond);
        return bondRepository.save(bond);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteBond(@PathVariable Long id) {
        bondRepository.delete(findBond(id));
    }

    private void validateSensitivityShock(double yieldRate, double yieldChange) {
        if (!Double.isFinite(yieldChange)) {
            throw new IllegalArgumentException("yieldChange must be finite");
        }
        if (!Double.isFinite(yieldRate + yieldChange) || yieldRate + yieldChange <= -1.0) {
            throw new IllegalArgumentException(
                    "yieldRate plus yieldChange must be greater than -1"
            );
        }
    }

    private void validateFloatingRateInputs(double spread, double[] referenceRates) {
        if (!Double.isFinite(spread)) {
            throw new IllegalArgumentException("spread must be finite");
        }
        if (referenceRates == null || referenceRates.length == 0) {
            throw new IllegalArgumentException("referenceRates must contain at least one rate");
        }
        for (double referenceRate : referenceRates) {
            if (!Double.isFinite(referenceRate)) {
                throw new IllegalArgumentException("referenceRates must contain only finite values");
            }
            double couponRate = referenceRate + spread;
            if (!Double.isFinite(couponRate) || couponRate < 0.0) {
                throw new IllegalArgumentException(
                        "each referenceRate plus spread must produce a finite, nonnegative coupon rate"
                );
            }
        }
    }

    private void copyFields(Bond source, Bond target) {
        BondMath.requireFrequency(source.getCouponFrequency());
        target.setFaceValue(source.getFaceValue());
        target.setCouponRate(source.getCouponRate());
        target.setMaturityDate(source.getMaturityDate());
        target.setIssuer(source.getIssuer());
        target.setBondType(source.getBondType());
        target.setCouponFrequency(source.getCouponFrequency());
    }

    private Bond findBond(Long id) {
        return bondRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Bond not found"
                ));
    }

    @Operation(summary = "Price from a flat yield (frequency: coupons per year, 1/2/4/12)")
    @PostMapping("/price")
    public double calculateBondPrice(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @DecimalMin(value = "-1.0", inclusive = false, message = "yieldRate must be greater than -1") double yieldRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondPricingService.calculatePrice(
                faceValue, couponRate, yieldRate, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Price by discounting each cash flow on the supplied yield curve")
    @PostMapping("/price/curve")
    public double calculateBondPriceUsingCurve(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestBody YieldCurve yieldCurve,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondPricingService.calculatePriceUsingCurve(
                faceValue, couponRate, yearsToMaturity, yieldCurve, frequency
        );
    }

    @Operation(summary = "Yield to maturity from a market price (bracketing solver)")
    @PostMapping("/ytm")
    public double calculateYtm(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @Positive(message = "marketPrice must be greater than 0") double marketPrice,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondYtmService.calculateYtm(
                faceValue, couponRate, marketPrice, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Macaulay duration in years")
    @PostMapping("/duration")
    public double calculateMacaulayDuration(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @DecimalMin(value = "-1.0", inclusive = false, message = "yieldRate must be greater than -1") double yieldRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondDurationService.calculateMacaulayDuration(
                faceValue, couponRate, yieldRate, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Modified duration")
    @PostMapping("/modified-duration")
    public double calculateModifiedDuration(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @DecimalMin(value = "-1.0", inclusive = false, message = "yieldRate must be greater than -1") double yieldRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondModifiedDurationService.calculateModifiedDuration(
                faceValue, couponRate, yieldRate, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Convexity (years squared)")
    @PostMapping("/convexity")
    public double calculateConvexity(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @DecimalMin(value = "-1.0", inclusive = false, message = "yieldRate must be greater than -1") double yieldRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondConvexityService.calculateConvexity(
                faceValue, couponRate, yieldRate, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Duration + convexity estimate of the price change for a yield move")
    @PostMapping("/sensitivity")
    public BondSensitivityService.SensitivityResult calculateSensitivity(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @DecimalMin(value = "-1.0", inclusive = false, message = "yieldRate must be greater than -1") double yieldRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam double yieldChange,
            @RequestParam(defaultValue = "1") int frequency) {
        validateSensitivityShock(yieldRate, yieldChange);
        return bondSensitivityService.calculateSensitivity(
                faceValue, couponRate, yieldRate, yearsToMaturity, yieldChange, frequency
        );
    }

    @Operation(summary = "Fixed-coupon cash flow schedule")
    @PostMapping("/cash-flows")
    public List<BondCashFlowService.CashFlow> generateCashFlows(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @DecimalMin(value = "0.0", message = "couponRate must be at least 0") double couponRate,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondCashFlowService.generateFixedCouponCashFlows(
                faceValue, couponRate, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Zero-coupon cash flow schedule")
    @PostMapping("/zero-coupon-cash-flows")
    public List<BondCashFlowService.CashFlow> generateZeroCouponCashFlows(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam @Positive(message = "yearsToMaturity must be greater than 0") int yearsToMaturity,
            @RequestParam(defaultValue = "1") int frequency) {
        return bondCashFlowService.generateZeroCouponCashFlows(
                faceValue, yearsToMaturity, frequency
        );
    }

    @Operation(summary = "Floating-rate cash flow schedule (one reference rate per period)")
    @PostMapping("/floating-rate-cash-flows")
    public List<BondCashFlowService.CashFlow> generateFloatingRateCashFlows(
            @RequestParam @Positive(message = "faceValue must be greater than 0") double faceValue,
            @RequestParam double spread,
            @RequestParam double[] referenceRates,
            @RequestParam(defaultValue = "1") int frequency) {
        validateFloatingRateInputs(spread, referenceRates);
        return bondCashFlowService.generateFloatingRateCashFlows(
                faceValue, spread, referenceRates, frequency
        );
    }
}