package com.example.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Tag(name = "Portfolios")
@RestController
@RequestMapping("/portfolios")
public class PortfolioController {

    private final PortfolioRepository portfolioRepository;
    private final BondRepository bondRepository;

    public PortfolioController(
            PortfolioRepository portfolioRepository,
            BondRepository bondRepository) {
        this.portfolioRepository = portfolioRepository;
        this.bondRepository = bondRepository;
    }

    @Operation(summary = "Create a portfolio from holdings [{bondId, quantity}] (or plain bondIds = 1 unit each)")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public Portfolio createPortfolio(@Valid @RequestBody PortfolioRequest request) {
        Portfolio portfolio = new Portfolio();
        portfolio.setName(request.getName());
        applyHoldings(portfolio, request);
        return portfolioRepository.save(portfolio);
    }

    @GetMapping
    public List<Portfolio> getAllPortfolios() {
        return portfolioRepository.findAll();
    }

    @GetMapping("/{id}")
    public Portfolio getPortfolio(@PathVariable Long id) {
        return findPortfolio(id);
    }

    @Transactional
    @PutMapping("/{id}")
    public Portfolio updatePortfolio(
            @PathVariable Long id,
            @Valid @RequestBody PortfolioRequest request) {
        Portfolio portfolio = findPortfolio(id);
        portfolio.setName(request.getName());
        applyHoldings(portfolio, request);
        return portfolioRepository.save(portfolio);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePortfolio(@PathVariable Long id) {
        portfolioRepository.delete(findPortfolio(id));
    }

    /**
     * Brings the portfolio's holdings in line with the request by editing the managed
     * collection in place (replacing it would break orphanRemoval, and delete+insert of
     * the same composite key in one flush would collide).
     */
    private void applyHoldings(Portfolio portfolio, PortfolioRequest request) {
        if (request.getHoldings() != null && request.getBondIds() != null) {
            throw new IllegalArgumentException(
                    "Provide either holdings or bondIds, not both"
            );
        }

        List<HoldingRequest> requestedHoldings = request.getHoldings();
        if (requestedHoldings == null) {
            requestedHoldings = request.getBondIds() == null
                    ? List.of()
                    : request.getBondIds().stream()
                            .map(bondId -> new HoldingRequest(bondId, BigDecimal.ONE))
                            .toList();
        }

        Set<Long> bondIds = new HashSet<>();
        for (HoldingRequest holding : requestedHoldings) {
            if (holding == null || holding.getBondId() == null) {
                throw new IllegalArgumentException(
                        "Each holding must include a bondId"
                );
            }
            if (!bondIds.add(holding.getBondId())) {
                throw new IllegalArgumentException(
                        "A bond can appear only once in a portfolio"
                );
            }
            if (holding.getQuantity() != null
                    && holding.getQuantity().compareTo(BigDecimal.ZERO) <= 0) {
                throw new IllegalArgumentException(
                        "Holding quantity must be greater than 0"
                );
            }
        }

        Map<Long, Bond> bondsById = bondRepository.findAllById(bondIds).stream()
                .collect(Collectors.toMap(Bond::getId, Function.identity()));
        if (bondsById.size() != bondIds.size()) {
            Set<Long> missingBondIds = new HashSet<>(bondIds);
            missingBondIds.removeAll(bondsById.keySet());
            throw new IllegalArgumentException(
                    "Unknown bond IDs: " + missingBondIds
            );
        }

        Map<Long, PortfolioHolding> existing = new java.util.HashMap<>();
        for (PortfolioHolding holding : portfolio.getHoldings()) {
            existing.put(holding.getBond().getId(), holding);
        }

        portfolio.getHoldings().removeIf(
                holding -> !bondIds.contains(holding.getBond().getId()));

        for (HoldingRequest requestHolding : requestedHoldings) {
            BigDecimal quantity = requestHolding.getQuantity() == null
                    ? BigDecimal.ONE
                    : requestHolding.getQuantity();
            PortfolioHolding holding = existing.get(requestHolding.getBondId());
            if (holding == null) {
                holding = new PortfolioHolding();
                holding.setPortfolio(portfolio);
                holding.setBond(bondsById.get(requestHolding.getBondId()));
                portfolio.getHoldings().add(holding);
            }
            holding.setQuantity(quantity);
        }
    }

    private Portfolio findPortfolio(Long id) {
        return portfolioRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Portfolio not found"
                ));
    }

    public static class PortfolioRequest {
        @NotBlank(message = "name is required")
        private String name;
        private List<Long> bondIds;
        private List<HoldingRequest> holdings;

        public PortfolioRequest() {
        }

        public String getName() {
            return name;
        }

        public void setName(String name) {
            this.name = name;
        }

        public List<Long> getBondIds() {
            return bondIds;
        }

        public void setBondIds(List<Long> bondIds) {
            this.bondIds = bondIds;
        }

        public List<HoldingRequest> getHoldings() {
            return holdings;
        }

        public void setHoldings(List<HoldingRequest> holdings) {
            this.holdings = holdings;
        }
    }

    public static class HoldingRequest {
        private Long bondId;
        private BigDecimal quantity;

        public HoldingRequest() {
        }

        public HoldingRequest(Long bondId, BigDecimal quantity) {
            this.bondId = bondId;
            this.quantity = quantity;
        }

        public Long getBondId() {
            return bondId;
        }

        public void setBondId(Long bondId) {
            this.bondId = bondId;
        }

        public BigDecimal getQuantity() {
            return quantity;
        }

        public void setQuantity(BigDecimal quantity) {
            this.quantity = quantity;
        }
    }
}
