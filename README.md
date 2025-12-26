ERP Backend — Inventory Driven System

This project is a backend ERP system developed as a technical assignment for a Junior Node.js Backend Developer role.

The system follows real ERP principles: inventory changes only through documents, confirmed documents are immutable, and all operations are auditable.

Core business flow:
Products → Purchase Receipts → Sales → Dashboard

Tech Stack:
Node.js
TypeScript
NestJS
MongoDB (Mongoose)
bcrypt
JWT
MongoDB Aggregation Pipeline

Implemented Modules:

Products:
CRUD operations with strict tracking rules.
Tracking types supported: SIMPLE, EXPIRABLE, SERIALIZED, LOT_TRACKED, VARIANT.
Variant parent products are not sellable or stockable.
Variants have their own SKU and stock.
Tracking type cannot be changed after the product is used.
Soft delete is implemented using is_active.

Inventory Core:
Centralized inventory logic acting as a single source of truth.
Supports quantity stock, serial numbers, lot tracking, and expiration tracking.
Negative stock is not allowed.
Serial uniqueness is enforced.

Purchase Receipts:
Document lifecycle: DRAFT → CONFIRMED → CANCELLED.
Draft documents are editable and do not affect stock.
Confirmed receipts increase stock, record purchase cost, and become immutable.
Cancelled receipts revert stock and require a cancellation reason.
Tracking rules are enforced based on product type.

Sales:
Document lifecycle: DRAFT → CONFIRMED → CANCELLED.
Draft sales are editable and do not affect stock.
Confirmed sales decrease stock and enforce strict tracking rules.
Sales cannot be confirmed without sufficient stock.
Cancelled sales restore stock and require a cancellation reason.
Confirmed sales are immutable.

Dashboard:
Dashboard shows only confirmed documents.
Implemented reports include sales summary, daily sales, top products, inventory summary, and purchase summary.
All reports use MongoDB aggregation pipelines.

ERP Rules Enforced:
Confirmed documents are immutable.
Inventory changes only via purchase receipts and sales.
No hard deletes for operational data.
Strict document status transitions.
Full audit trail on all documents.

Allowed Status Transitions:
DRAFT to CONFIRMED.
DRAFT to CANCELLED.
CONFIRMED to CANCELLED.

How to Run:
npm install
npm run start:dev

Important Notes:
Variant parent products cannot be purchased or sold.
Dashboard ignores draft and cancelled documents.
Stock can never go negative.
Status change represents a business action, not a simple update.

Author:
Ziyodillo Najmiddinov — Strong Junior Node.js Backend Developer

License:
MIT
