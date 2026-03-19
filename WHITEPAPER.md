# CFT.live Project Whitepaper

## Status

- Version: 1.0
- Date: 2026-03-19
- Scope: Project-level overview of the CFT.live platform
- Network focus: Arbitrum One for on-chain settlement and token distribution

## Abstract

CFT.live is a Web3 platform for hosting smart contract products and related Web3 tools under a single service layer. Its purpose is not only to deploy contracts, but to make them usable, operable, and extensible through a full-stack product surface: user interfaces, supporting automation, indexed data, contributor workflows, and a revenue-sharing model aligned with the people who help build the platform.

At a high level, CFT.live combines three layers:

1. On-chain products and token infrastructure on Arbitrum.
2. A web platform that exposes those products to users through a unified application experience.
3. A contributor system that lets builders earn CFT for approved work and later convert that CFT into USDC through a redemption pool backed by platform revenue.

This document describes the platform model, the contributor economy, the system architecture, and the trust boundaries between off-chain operations and on-chain settlement. It is not a contract-by-contract technical specification. Detailed behavior for individual contracts and protocol components belongs in the dedicated smart-contract whitepapers in this repository.

## Vision

Most smart contracts are published as isolated pieces of infrastructure. They may be technically sound, but they often lack the surrounding service layer required to become durable products: clear interfaces, operational automation, analytics, contributor coordination, and a sustainable way to fund ongoing iteration.

CFT.live is designed to solve that problem. The platform exists to host, operate, and extend smart contract applications as a coherent Web3 service rather than a loose collection of deployments. In this model, the contract is only one part of the system. The broader platform provides discovery, access, transaction flows, supporting APIs, background services, and transparent contribution accounting.

The long-term idea is straightforward:

- users interact with smart contract products through CFT.live
- those products generate platform revenue
- that revenue strengthens the backing of the CFT redemption pool
- contributors who help build and improve the platform earn CFT
- contributors can redeem CFT for USDC over time

This creates a contributor-aligned platform economy in which builders participate in the upside of the products they help create.

## Platform Model

CFT.live should be understood as a hosting and operations layer for Web3 tools, not as a single decentralized application with one contract and one interface. The platform brings multiple smart contract experiences into one environment and standardizes how users access them, how operators maintain them, and how contributors improve them.

That model has several practical consequences.

First, product delivery is unified. Users do not need to discover a separate stack for every contract experience. They interact through one branded platform with consistent wallet flows, shared frontend conventions, and common operational support.

Second, platform operations are explicit. Many on-chain systems require background advancement, indexing, session handling, presence, or administrative coordination. CFT.live treats these as first-class parts of the product rather than informal scripts around the edges.

Third, product development is opened to contributors. Instead of reserving all development upside for a fixed operator team, CFT.live uses a contribution system that lets external builders participate directly in the growth of the platform.

## Contributor Economy

The core economic idea behind CFT.live is that platform growth should not only benefit operators. It should also benefit contributors who create the code, design, research, documentation, reviews, and operational improvements that expand the platform.

The contribution model uses the following high-level flow:

1. A platform initiative is organized as a Feature.
2. Each Feature carries a fixed `total_tokens_reward` budget in CFT.
3. Work inside that Feature is broken into Tasks.
4. Contributors claim Tasks and submit Contributions.
5. Approved Contributions receive Contribution Points, or CP.
6. When the Feature is completed, the CFT reward budget is distributed proportionally according to each contributor's share of total approved CP.
7. Distributed CFT may later be redeemed for USDC through the redemption pool.

This model separates two questions that are often blurred together in token systems.

The first question is: who earned a reward, and how much? In CFT.live, that is determined through the contribution workflow, using reviewed work and CP-based allocation.

The second question is: what gives that reward practical value? In CFT.live, the answer is the redemption path. Platform revenue is intended to flow into a USDC-backed redemption pool, allowing contributors to exchange earned CFT for a pro-rata claim on that pool.

The result is a contributor economy that is neither a pure salary system nor a purely speculative token model. Contributors are compensated with an asset tied to platform participation, and that asset has a defined path to USDC redemption through a revenue-backed pool.

## Value Flow

The CFT.live value loop is simple in concept, even though its implementation spans multiple systems.

### 1. Platform usage

Users access smart contract products and related Web3 utilities through CFT.live. The platform provides the user-facing layer that makes these tools accessible and operable.

### 2. Revenue generation

As platform activity grows, the products hosted by CFT.live generate revenue for the broader ecosystem.

### 3. Revenue backing

That revenue is intended to strengthen the USDC backing available to CFT holders through the redemption pool.

### 4. Contributor rewards

Contributors who complete approved work receive CFT according to the Feature and CP distribution model.

### 5. Redemption

Contributors may redeem earned CFT for USDC from the redemption pool, converting platform participation into a directly usable stable asset.

This is the central economic thesis of the project: the service layer around smart contracts can generate durable value, and that value can be shared back with contributors rather than being captured only by operators.

## Architecture Overview

The platform uses a hybrid architecture because different parts of the system have different requirements.

### Web application layer

The main user-facing application is a Next.js-based frontend deployed to Cloudflare through OpenNext. This layer is responsible for product access, wallet-connected user flows, and the broader interface through which users and contributors interact with CFT.live.

### Worker and automation layer

Supporting Cloudflare Workers provide edge-native services such as runtime presence tracking and automated operational tasks. These services are part of what makes the platform function as an active product environment rather than a static interface in front of contracts.

### Contribution operations layer

A separate backend manages contributor records, Features, Tasks, Contributions, approvals, and payout ledger data. This operational layer is intentionally distinct from the contracts themselves. It supports the workflow needed to review work, assign CP, record distributions, and provide transparent administrative history.

### Smart contract layer

The on-chain layer handles contract execution, token issuance for contributor payouts, and token redemption against a USDC pool. This is where settlement occurs. It is also the layer that produces durable public receipts for token distributions and redemptions.

### Indexing and data access layer

Blockchain-derived data is indexed for application use so that the frontend and operators can present live contract state in a usable way. This is an essential service layer for any serious Web3 platform: raw chain data exists, but indexers and application logic are what make it accessible to users.

Taken together, these layers form a practical platform stack:

- Cloudflare for the public web and edge services
- dedicated backend infrastructure for contributor workflow and administrative data
- Arbitrum smart contracts for execution and settlement
- indexed blockchain data for product usability and transparency

## Transparency And Trust Model

CFT.live is designed to be transparent, but it is not purely trustless in every layer.

That distinction matters.

### What is primarily off-chain

The platform decides how work is organized and reviewed off-chain. Feature creation, Task assignment, contribution review, and CP awards are operational decisions made through the contributor workflow. These decisions are visible and structured, but they are still governance and operations decisions rather than automatic outcomes produced by smart contracts.

### What is primarily on-chain

Once payouts are executed, token distribution and redemption are settled on-chain. The contracts provide public transaction history, role-bound issuance paths, and redemption behavior that can be independently verified from chain state.

### Why this split exists

Contribution quality, design impact, product scope, and review fairness are human questions. They cannot be reduced cleanly to deterministic contract rules without losing flexibility or judgment. By contrast, token settlement and redemption are well suited to on-chain enforcement.

The platform therefore uses a mixed model:

- human judgment for deciding what work deserves reward
- on-chain settlement for executing token issuance and redemption transparently

This is a pragmatic design choice. It preserves operational flexibility while still anchoring the most economically sensitive actions in public, verifiable systems.

## Economic Boundaries And Important Caveats

The project-level model should be understood with several constraints in mind.

First, CFT redemption value is not a fixed promise. It depends on the relationship between outstanding CFT supply and the USDC available in the redemption pool.

Second, the statement that platform revenue backs contributor rewards is a platform policy and economic design goal. The contracts provide the redemption mechanism, but operational discipline is still required to route and maintain backing in practice.

Third, contributor rewards are not assigned automatically by smart contracts. They depend on review, approval, and CP assignment through the contributor workflow.

Fourth, the integrity of the system depends on sound key management, payout controls, and responsible administration across both the off-chain and on-chain layers.

For these reasons, this document should not be read as legal, financial, or investment advice. If any project-level description differs from deployed contract code, the deployed code and its dedicated technical documentation govern the contract behavior.

## Why This Model Matters

Many Web3 projects struggle with one of two failures.

Some are technically decentralized but operationally incomplete. They publish contracts without building the product and contribution systems needed for long-term usefulness.

Others build good products, but keep the upside of platform growth tightly centralized.

CFT.live is attempting a different approach. It treats smart contracts as products that require a service layer, and it treats contributors as stakeholders in platform growth rather than disposable external labor. The use of CFT as a contributor reward asset, combined with a USDC redemption path backed by platform revenue, is meant to align ongoing development with actual platform usage.

In practical terms, that means:

- contributors can work on an expanding Web3 platform instead of isolated one-off tasks
- users get access to maintained smart contract products through a unified service layer
- the platform can continue evolving because improvement work has a defined economic path

## Conclusion

CFT.live is a platform for hosting and operating smart contract products as a coherent Web3 service. Its defining idea is that the surrounding service layer matters: frontend access, automation, contribution workflows, payout tracking, and redemption infrastructure are all part of the product, not optional extras.

The project's second defining idea is contributor alignment. By organizing work into Features and Tasks, rewarding approved Contributions with CP-based CFT distributions, and linking CFT redemption to a USDC pool backed by platform revenue, CFT.live creates a model in which contributors can share in the value created by the platform they help build.

This whitepaper is the high-level statement of that model. The detailed contract mechanics live in the dedicated smart-contract whitepapers. Together, they describe a system intended to be usable as a product, transparent as an operation, and aligned with the contributors who make its growth possible.