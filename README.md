# BondLab

### Fixed-Income Analytics & Interest Rate Risk Engine

BondLab is a full-stack fixed-income analytics platform designed to model bond valuations, analyze interest-rate risk, construct yield curves, and evaluate portfolio performance.

Built with Java, Spring Boot, PostgreSQL and React, the platform combines financial mathematics with a RESTful backend and an interactive analytics interface.

---

## Features

### Bond Analytics

- Bond creation, retrieval, updating and deletion.
    
- Discounted cash flow (DCF) bond pricing.
    
- Yield-to-Maturity (YTM) calculation using a bracketing and bisection solver.
    
- Macaulay duration and modified duration.
    
- Convexity calculation.
    
- Price sensitivity analysis under interest-rate changes.
    
- Coupon cash-flow generation with configurable payment frequency.
    

### Yield Curve Management

- Create and manage multi-tenor yield curves.
    
- Linear interpolation between curve tenors.
    
- Parallel yield-curve shifts.
    
- Steepening and flattening scenarios.
    
- Repricing using shifted yield curves.
    

### Portfolio Risk Analytics

- Portfolio construction with bond quantities.
    
- Market valuation and weighted yield.
    
- Weighted modified duration and convexity.
    
- Interest-rate shock simulations.
    
- Scenario analysis across -200 to +200 basis points.
    
- Identification of matured instruments excluded from valuation.
    

### Interactive Dashboard

- Bond inventory and management.
    
- Yield curve editor and visualization.
    
- Portfolio construction and management.
    
- Portfolio analytics and scenario charts.
    
- Bond pricing calculator.
    

---

## Technology Stack

|Layer|Technologies|
|---|---|
|Backend|Java, Spring Boot|
|Persistence|Spring Data JPA, Hibernate|
|Database|PostgreSQL|
|Frontend|React, TypeScript, Vite|
|Styling|Tailwind CSS|
|Data Visualization|Recharts|
|API Documentation|Swagger / OpenAPI|
|Testing|JUnit 5|
|Build Tools|Maven Wrapper, npm|
|Infrastructure|Docker Compose|

---

## Architecture

```
                  BondLab
                     |
          +----------+----------+
          |                     |
     React Frontend        Spring Boot API
     React + TypeScript          |
          |              +------+------+
          |              |             |
      REST API        Controllers   Services
          |              |             |
          +-----------> Repositories
                               |
                         Spring Data JPA
                               |
                           PostgreSQL
```

The backend follows a layered Controller–Service–Repository architecture, separating HTTP request handling, financial calculations and database persistence.

The frontend communicates with the backend through REST APIs.

---

## Project Structure

```
BondLab/
├── backend/
│   ├── src/
│   ├── .mvn/
│   ├── mvnw
│   └── pom.xml
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── package-lock.json
│
├── docker-compose.yml
├── .env.example
├── .gitignore
└── README.md
```

---

## Getting Started

### Prerequisites

Install the following:

- Java 25 or a compatible version supported by the backend.
    
- Node.js and npm.
    
- Docker Desktop.
    
- Git.
    

### 1. Clone the repository

```
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd BondLab
```

### 2. Configure environment variables

Create your local environment file:

```
cp .env.example .env
```

Edit `.env` and ensure the database credentials are consistent between the `DB_*` and `POSTGRES_*` variables.

Never commit your `.env` file.

### 3. Start PostgreSQL

```
docker compose up -d
```

This starts PostgreSQL 17 on port `5433` and creates a persistent Docker volume for database storage.

### 4. Start the backend

Open a terminal in the project root:

```
cd backend
```

Load the environment variables and start Spring Boot:

```
set -a
source ../.env
set +a
./mvnw spring-boot:run
```

Backend URL:

`http://localhost:8080`

Swagger UI:

`http://localhost:8080/swagger-ui.html`

### 5. Start the frontend

Open a second terminal:

```
cd frontend
npm ci
npm run dev
```

Frontend URL:

`http://localhost:5173`

---

## API Overview

|Module|Endpoints|
|---|---|
|Bonds|`/bonds`|
|Bond Calculators|`/bonds/price`, `/bonds/ytm`, `/bonds/duration`, `/bonds/convexity`|
|Yield Curves|`/yield-curves`|
|Portfolios|`/portfolios`|
|Portfolio Metrics|`/portfolios/{id}/metrics`|
|Portfolio Scenarios|`/portfolios/{id}/scenarios`|
|Rate Shocks|`/portfolios/{id}/rate-shock`|

Complete endpoint documentation is available through Swagger UI.

---

## Financial Methodology

BondLab implements several fixed-income valuation and risk measures.

- **Bond Pricing:** Discounted cash flow valuation using coupon and principal payments.
    
- **Yield to Maturity:** Numerical solution using bracketing and bisection.
    
- **Macaulay Duration:** Present-value-weighted average time to receive cash flows.
    
- **Modified Duration:** Measures approximate percentage price sensitivity to yield changes.
    
- **Convexity:** Captures the curvature of the bond price-yield relationship.
    
- **Portfolio Analytics:** Aggregates valuation and risk metrics across portfolio holdings.
    
- **Scenario Analysis:** Reprices portfolio holdings under changes in interest rates.
    

### Conventions

- Interest rates are represented as decimal fractions (`0.0679` = 6.79%).
    
- Rate shocks are expressed in basis points.
    
- Coupon frequency supports annual, semi-annual, quarterly and monthly payments.
    
- Duration is expressed in years.
    
- Convexity is expressed in years squared.
    

---

## Testing

Run backend tests using:

```
cd backend
./mvnw test
```

The test suite covers bond pricing, YTM calculations, duration, convexity, yield-curve mathematics, portfolio analytics and validation.

---

## Sample Data

The application seeds an illustrative universe of 19 fixed-income instruments, including:

- Government Securities (G-Secs)
    
- State Development Loans (SDLs)
    
- Treasury Bills
    
- Corporate Bonds
    

**Important:** Seeded instruments are illustrative sample data, not verified live market data.

---

## Known Limitations

- Coupon dates are modelled as evenly spaced periods rather than real settlement calendars.
    
- Accrued interest and clean-versus-dirty price calculations are not implemented.
    
- Portfolio analytics currently use a single supplied yield curve, without issuer-specific credit spreads.
    
- Authentication and authorization are not implemented.
    
- Database schema management currently uses Hibernate `ddl-auto=update`; database migrations are not yet implemented.
    

---

## Future Improvements

- Power BI reporting and interactive financial dashboards.
    
- Credit spread modelling for corporate bonds and SDLs.
    
- Real-world day-count conventions and accrued interest.
    
- Database migrations using Flyway.
    
- Authentication and role-based access control.
    
- Automated CI testing and deployment.
    

---

**BondLab — Fixed-Income Analytics & Interest Rate Risk Engine**