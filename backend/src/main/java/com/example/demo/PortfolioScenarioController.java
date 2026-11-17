package com.example.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Portfolio analytics")
@RestController
@RequestMapping("/portfolios")
public class PortfolioScenarioController {

    private final PortfolioRepository portfolioRepository;
    private final YieldCurveRepository yieldCurveRepository;
    private final PortfolioAnalyticsService analyticsService;

    public PortfolioScenarioController(
            PortfolioRepository portfolioRepository,
            YieldCurveRepository yieldCurveRepository,
            PortfolioAnalyticsService analyticsService) {
        this.portfolioRepository = portfolioRepository;
        this.yieldCurveRepository = yieldCurveRepository;
        this.analyticsService = analyticsService;
    }

    @Operation(summary = "Value a portfolio under one parallel rate shock (curve in body, or curveId)")
    @PostMapping("/{portfolioId}/rate-shock")
    public Map<String, Object> calculateRateShock(
            @PathVariable Long portfolioId,
            @RequestParam double shockBasisPoints,
            @RequestParam(required = false) Long curveId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate valuationDate,
            @RequestBody(required = false) YieldCurve yieldCurve) {

        Portfolio portfolio = findPortfolio(portfolioId);
        YieldCurve curve = resolveCurve(curveId, yieldCurve);
        LocalDate date = valuationDate == null ? LocalDate.now() : valuationDate;

        List<Long> excluded = new ArrayList<>();
        PortfolioAnalyticsService.ScenarioResult result = analyticsService.calculateRateShock(
                portfolio, curve, shockBasisPoints, date, excluded);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("originalValue", result.baseValue());
        response.put("shockedValue", result.shockedValue());
        response.put("valueChange", result.valueChange());
        response.put("valueChangePercent", result.valueChangePercent());
        response.put("valuationDate", date);
        response.put("excludedMaturedBondIds", excluded);
        return response;
    }

    @Operation(summary = "Run the standard -200/-100/0/+100/+200 bp scenario set (or custom shocks)")
    @PostMapping("/{portfolioId}/scenarios")
    public PortfolioAnalyticsService.ScenarioReport calculateScenarios(
            @PathVariable Long portfolioId,
            @RequestParam(required = false) List<Double> shocks,
            @RequestParam(required = false) Long curveId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate valuationDate,
            @RequestBody(required = false) YieldCurve yieldCurve) {

        Portfolio portfolio = findPortfolio(portfolioId);
        YieldCurve curve = resolveCurve(curveId, yieldCurve);
        LocalDate date = valuationDate == null ? LocalDate.now() : valuationDate;
        return analyticsService.calculateScenarios(portfolio, curve, shocks, date);
    }

    @Operation(summary = "Market value, weighted yield, weighted modified duration and convexity")
    @PostMapping("/{portfolioId}/metrics")
    public PortfolioAnalyticsService.PortfolioMetrics calculateMetrics(
            @PathVariable Long portfolioId,
            @RequestParam(required = false) Long curveId,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate valuationDate,
            @RequestBody(required = false) YieldCurve yieldCurve) {

        Portfolio portfolio = findPortfolio(portfolioId);
        YieldCurve curve = resolveCurve(curveId, yieldCurve);
        LocalDate date = valuationDate == null ? LocalDate.now() : valuationDate;
        return analyticsService.calculateMetrics(portfolio, curve, date);
    }

    private Portfolio findPortfolio(Long portfolioId) {
        return portfolioRepository.findById(portfolioId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Portfolio not found"));
    }

    private YieldCurve resolveCurve(Long curveId, YieldCurve body) {
        if (curveId != null && body != null) {
            throw new IllegalArgumentException("Provide either curveId or a yieldCurve body, not both");
        }
        if (curveId != null) {
            return yieldCurveRepository.findById(curveId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.NOT_FOUND, "Yield curve not found"))
                    .copy();
        }
        if (body == null) {
            throw new IllegalArgumentException("Provide a yieldCurve body or a curveId");
        }
        return body;
    }
}
