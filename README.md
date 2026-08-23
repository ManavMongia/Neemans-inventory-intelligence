# Neeman's Inventory Intelligence

An AI-powered inventory intelligence and planning system designed to help businesses monitor inventory health, identify risks, and make faster inventory decisions through AI-driven recommendations.

## Problem Statement

Inventory teams often rely on information distributed across multiple sources such as email exports and Google Sheets. Manually consolidating this information makes it difficult to identify stock-out risks, excess inventory, changing demand, and replenishment requirements quickly.

This project provides an internal inventory intelligence tool that consolidates inventory data, monitors SKU-level inventory health, and uses AI to generate actionable recommendations.

## Solution Overview

The system provides:

- SKU-level inventory monitoring
- Inventory health classification
- Sales velocity analysis
- Days-of-cover calculation
- Replenishment recommendations
- Stock-out risk detection
- Demand trend analysis
- Stock transfer recommendations
- Liquidation / overstock opportunities
- AI-generated reasoning and recommendations
- Automated inventory synchronization
- Inventory alerts and summaries
- Dashboard-based visualization of inventory health

## Key AI Intelligence Modules

### 1. Stock-out Prevention

Identifies SKUs at risk of running out of stock using inventory levels, reorder points, sales velocity, and days of cover.

The AI explains the reason for the risk and recommends appropriate corrective action.

### 2. Demand Trend Analysis

Analyzes sales behavior and demand patterns to identify increasing, decreasing, or stable demand.

This helps the business anticipate future inventory requirements rather than reacting only after inventory becomes critical.

### 3. Replenishment Planning

Identifies SKUs requiring replenishment and generates recommended replenishment quantities based on inventory position and sales velocity.

### 4. Stock Transfer Recommendations

Identifies situations where inventory can be transferred between locations instead of immediately placing a new purchase/replenishment order.

The system considers inventory availability and demand across warehouses.

### 5. Liquidation Opportunities

Identifies slow-moving or overstocked SKUs and recommends actions such as promotions, discounts, or inventory movement to reduce excess stock.

## Inventory Health Monitoring

The system tracks:

- Quantity on hand
- Reorder point
- Incoming stock
- Average daily sales
- Days of cover
- Sell-through rate
- Inventory status
- Replenishment recommendation quantity
- Warehouse/location
- Data source
- Last updated time

Inventory can be categorized into states such as:

- Healthy
- Low
- Critical
- Overstock

## AI Reasoning

The AI insight layer provides structured reasoning for:

- Stock-out risks
- Demand trends
- Stock transfers
- Liquidation opportunities
- Replenishment recommendations

The system stores AI-generated executive summaries, alert narratives, and recommendations for business users.

## Data Sources

For the assignment demonstration, the system uses inventory data representing:

- Email inventory exports
- Google Sheets inventory exports

The sample data is provided through CSV files and can be replaced with live business data sources in a production environment.

## System Architecture

The system follows a modular architecture consisting of four main layers:

1. **Data Sources**
   - Inventory data from email exports
   - Inventory data from Google Sheets exports

2. **Backend & Data Processing**
   - FastAPI backend
   - Data synchronization and consolidation
   - SQLite database using SQLAlchemy
   - Inventory health and SKU-level calculations

3. **AI Intelligence Layer**
   - Inventory risk analysis
   - Demand trend analysis
   - Stock-out prevention
   - Replenishment recommendations
   - Stock transfer recommendations
   - Liquidation opportunity detection
   - AI-generated reasoning and business recommendations

4. **Frontend & Alerts**
   - Next.js dashboard
   - Inventory health visualization
   - AI insights and recommendations
   - Inventory alerts and summaries

Overall flow:

Data Sources → Data Synchronization → Database → Inventory Analysis → AI Intelligence → Recommendations & Alerts → Dashboard
