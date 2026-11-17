package com.example.demo;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface BondRepository extends JpaRepository<Bond, Long> {

    boolean existsByIssuer(String issuer);

    Optional<Bond> findFirstByIssuer(String issuer);
}
