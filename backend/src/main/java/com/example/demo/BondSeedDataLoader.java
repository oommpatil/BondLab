package com.example.demo;

import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

/**
 * Seeds a sample universe of Indian fixed-income instruments on startup.
 *
 * This is ILLUSTRATIVE sample data for development and demos: coupons and
 * maturities are approximate, SDL/corporate entries are labelled "Sample", and
 * T-Bill maturities are set relative to the day they are first seeded. Verify
 * against RBI/NSE/issuer sources before presenting any of it as market data.
 *
 * Loading is idempotent: bonds are matched by issuer name. Existing rows from
 * earlier versions only get their new bondType/couponFrequency columns filled in.
 */
@Component
public class BondSeedDataLoader implements CommandLineRunner {

    private final BondRepository bondRepository;

    public BondSeedDataLoader(BondRepository bondRepository) {
        this.bondRepository = bondRepository;
    }

    @Override
    public void run(String... args) {
        LocalDate today = LocalDate.now();

        List<SeedBond> seedBonds = List.of(
                // Government securities (semi-annual)
                gSec("Government of India - 6.79% GS 2027", 0.0679, LocalDate.of(2027, 5, 15)),
                gSec("Government of India - 7.17% GS 2028", 0.0717, LocalDate.of(2028, 1, 8)),
                gSec("Government of India - 7.06% GS 2028", 0.0706, LocalDate.of(2028, 4, 10)),
                gSec("Government of India - 7.37% GS 2028", 0.0737, LocalDate.of(2028, 4, 23)),
                gSec("Government of India - 7.10% GS 2029", 0.0710, LocalDate.of(2029, 4, 18)),
                gSec("Government of India - 7.26% GS 2033", 0.0726, LocalDate.of(2033, 2, 6)),
                gSec("Government of India - 7.18% GS 2037", 0.0718, LocalDate.of(2037, 7, 24)),
                gSec("Government of India - 7.30% GS 2053", 0.0730, LocalDate.of(2053, 6, 19)),

                // State development loans (semi-annual)
                new SeedBond("Sample SDL - Karnataka 7.40% 2032", BondType.SDL, 0.0740,
                        LocalDate.of(2032, 3, 15), 2, 10_000),
                new SeedBond("Sample SDL - Tamil Nadu 7.50% 2033", BondType.SDL, 0.0750,
                        LocalDate.of(2033, 3, 15), 2, 10_000),
                new SeedBond("Sample SDL - Maharashtra 7.45% 2034", BondType.SDL, 0.0745,
                        LocalDate.of(2034, 3, 15), 2, 10_000),
                new SeedBond("Sample SDL - Gujarat 7.52% 2035", BondType.SDL, 0.0752,
                        LocalDate.of(2035, 3, 15), 2, 10_000),

                // Treasury bills (zero coupon; maturity relative to first seeding)
                new SeedBond("91-Day Treasury Bill (sample)", BondType.T_BILL, 0.0,
                        today.plusDays(91), 4, 10_000),
                new SeedBond("182-Day Treasury Bill (sample)", BondType.T_BILL, 0.0,
                        today.plusDays(182), 2, 10_000),
                new SeedBond("364-Day Treasury Bill (sample)", BondType.T_BILL, 0.0,
                        today.plusDays(364), 2, 10_000),

                // Corporate bonds (semi-annual)
                new SeedBond("Sample Corporate - AAA PSU Finance 7.60% 2030", BondType.CORPORATE, 0.0760,
                        LocalDate.of(2030, 6, 30), 2, 1_000),
                new SeedBond("Sample Corporate - AAA Infrastructure 7.85% 2032", BondType.CORPORATE, 0.0785,
                        LocalDate.of(2032, 9, 30), 2, 1_000),
                new SeedBond("Sample Corporate - AA+ NBFC 8.40% 2029", BondType.CORPORATE, 0.0840,
                        LocalDate.of(2029, 12, 31), 2, 1_000),
                new SeedBond("Sample Corporate - AAA Power 7.70% 2036", BondType.CORPORATE, 0.0770,
                        LocalDate.of(2036, 3, 31), 2, 1_000)
        );

        for (SeedBond seed : seedBonds) {
            Optional<Bond> existing = bondRepository.findFirstByIssuer(seed.issuer());
            if (existing.isPresent()) {
                Bond bond = existing.get();
                boolean changed = false;
                if (bond.getBondType() == null) {
                    bond.setBondType(seed.bondType());
                    changed = true;
                }
                if (bond.getCouponFrequency() == 1 && seed.frequency() != 1
                        && seed.bondType() == BondType.G_SEC) {
                    // Legacy rows default to annual; G-Secs pay semi-annually.
                    bond.setCouponFrequency(seed.frequency());
                    changed = true;
                }
                if (changed) {
                    bondRepository.save(bond);
                }
                continue;
            }

            Bond bond = new Bond();
            bond.setIssuer(seed.issuer());
            bond.setBondType(seed.bondType());
            bond.setFaceValue(seed.faceValue());
            bond.setCouponRate(seed.couponRate());
            bond.setMaturityDate(seed.maturityDate());
            bond.setCouponFrequency(seed.frequency());
            bondRepository.save(bond);
        }
    }

    private static SeedBond gSec(String issuer, double couponRate, LocalDate maturityDate) {
        return new SeedBond(issuer, BondType.G_SEC, couponRate, maturityDate, 2, 10_000);
    }

    private record SeedBond(
            String issuer,
            BondType bondType,
            double couponRate,
            LocalDate maturityDate,
            int frequency,
            double faceValue
    ) {
    }
}
