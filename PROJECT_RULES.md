# Juco Cafe — Project Rules

> **How to use this file:** Tell the agent: **"Read the rules"** (or point to this file: `PROJECT_RULES.md`).
> These rules apply to every audit, change, and conversation about this project.

---

## Project Vision

This is **NOT** a marketplace like Wolt or Uber Eats.

It is a **modern ordering platform for a single café/restaurant** with its own delivery drivers.

### Core Philosophy

- Keep everything **simple**
- **Excellent** customer experience
- **Fast** workflow for employees
- Very small number of drivers (usually **2**, maximum **3**)
- **No** unnecessary enterprise complexity

---

## User Roles

There are only **three** user roles:

1. **Customer**
2. **Driver**
3. **Admin**

---

## Customer Experience

The customer should be able to:

- Browse products
- Add products to cart
- Checkout easily
- Select delivery location on **Google Maps**
- Use **Google Autocomplete**
- Adjust pin manually
- Pay
- Track order status
- Track driver in real time (**only after assignment**)

Customer experience must feel **smooth**, **modern**, and **mobile-first**.

---

## Driver Experience

Drivers are extremely simple. Usually there are only **two** drivers working.

A driver should **only** be able to:

- Login
- Go **Online** / **Offline**
- Receive delivery assignment
- Accept delivery
- Navigate
- Mark:
  - **Arrived**
  - **Picked Up**
  - **Delivered**

**Nothing more.**

---

## Admin Experience

The admin controls everything.

### Main Workflow

```
New Order → Accept → Preparing → Assign Driver → Out for Delivery → Delivered
```

The admin should always know:

- Which driver is **available**
- Which driver is **busy**
- Which order each driver has

**No** complicated dispatch algorithms.

---

## Driver Assignment

The assignment system must remain **simple**:

| Situation                     | Action                               |
| ----------------------------- | ------------------------------------ |
| Only **one** driver available | Assign **automatically**             |
| **Two** drivers available     | Admin chooses one with **one click** |

**Do not add:**

- Optimization engines
- AI dispatching
- Route balancing

---

## Google Maps

Google Maps is a **core feature**.

### Requirements

- Initialize **only once**
- **Never** recreate the map unnecessarily
- Smooth dragging
- Smooth reverse geocoding
- Stable marker
- Excellent UX

**Performance and stability** are more important than adding features.

---

## Technical Philosophy

### Priorities (in order)

1. **Stability**
2. **Simplicity**
3. **Maintainability**
4. **Performance**
5. **UX**

### Avoid

- Unnecessary abstractions
- Premature optimization
- Enterprise patterns unless truly needed

---

## Design Philosophy

Everything should feel:

- **Fast**
- **Clean**
- **Modern**
- **Minimal**
- **Mobile-first**

Users should complete actions in **as few clicks as possible**.

---

## Agent & Developer Rules

When auditing or modifying the project:

- Respect the **existing architecture**
- Prefer **simple** solutions
- **Avoid overengineering**
- Explain **why** something should change
- Keep components **reusable**
- Keep hooks focused on **one responsibility**
- Avoid unnecessary **rerenders**
- Avoid unnecessary **remounts**
- Prioritize **user experience**
- If something already works well, **do not redesign it**
- Always optimize for **simplicity**

### When Proposing Changes

- **Never** rewrite working code just because it can be improved
- Prefer **incremental** improvements
- **Preserve** existing functionality
- **Minimize** code changes
- Always explain the **root cause** before proposing a fix

---

## Quick Reference

| Topic    | Rule                                    |
| -------- | --------------------------------------- |
| Scope    | Single café, not a marketplace          |
| Drivers  | 2–3 max, minimal UI                     |
| Dispatch | Auto if 1 free driver; admin picks if 2 |
| Maps     | Init once, stable, performant           |
| Changes  | Small diffs, don't break what works     |
