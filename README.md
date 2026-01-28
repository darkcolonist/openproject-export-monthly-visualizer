# Open Project Report Visualizer

## Overview

The **Cost Report Visualizer** is a specialized, client-side web application designed to transform raw Excel and CSV cost reports into high-fidelity visual analytics. By processing data locally within the browser, it ensures zero-latency performance and absolute data privacy, making it an ideal tool for sensitive project management reporting.

## Key Features

* **Project-Based Monthly Trends:** Generates a stacked bar chart visualizing total hours logged per month, segmented by project.
  * *Intelligent Filtering:* Automatically excludes inactive projects (zero hours) to maintain chart clarity.
  * *Granular Tooltips:* Provides detailed hour breakdowns per project upon interaction.

* **Developer Utilization Matrix:** A comprehensive data table displaying exact hour logs per developer, organized chronologically.

* **Dark Mode Interface:** A professional, high-contrast dark theme optimized for readability and extended usage.

* **Smart Header Detection:** Algorithms automatically identify the correct data schema, bypassing metadata rows often found in exported reports.

* **High-Resolution Export:** One-click functionality to render and download charts as PNG files for presentation decks.

## Input Specifications

The application is engineered to parse standard Cost Reports exported in `.xls`, `.xlsx`, or `.csv` formats. The parser automatically detects the following required columns regardless of column order:

| Column Name | Description |
| :--- | :--- |
| **Date (Spent)** or **Date** | Primary temporal key used for grouping data into monthly intervals (X-Axis). |
| **User** | Identifier for the developer resource, used for the utilization matrix. |
| **Project** | Grouping key for the stacked chart segments. |
| **Units** | Numerical value representing the billable hours. |

## Usage Guide

1. **Deployment:** Save the provided `index.html` file to a local directory.
2. **Launch:** Open the file using any standard web browser (Google Chrome, Microsoft Edge, Firefox, or Safari).
3. **Data Ingestion:** Drag and drop the target Cost Report file into the designated upload area.
4. **Analysis:** The dashboard will render immediately upon successful file parsing.
5. **Export:** Select "Save Image" to export the visual data for external reporting.

## Technical Architecture

This tool is architected as a **Single File Application (SFA)** to ensure maximum portability and ease of distribution. It leverages the following libraries via CDN:

* **SheetJS (xlsx):** Enterprise-grade parsing for spreadsheet data structures.
* **Chart.js:** A flexible charting library for rendering responsive, interactive visualizations.
* **Tailwind CSS:** A utility-first CSS framework for rapid, responsive UI development.
* **Phosphor Icons:** A clean, consistent icon family for the user interface.

## System Notes

* **Data Filtration:** Entries with zero hours are programmatically filtered out to ensure visualization integrity.
* **Unit Formatting:** All numerical values are treated as hours (h) by default.
* **Date Compatibility:** The system supports both Excel serial date formats and standard ISO string formats (e.g., YYYY-MM-DD).

---

© darkcolonist@gmail.com
