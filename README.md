# WhatsApp Habit Tracker Bot

A WhatsApp-based automation system designed to help users track daily habits, monitor consistency, and analyze behavioral patterns over time.

## Overview

This project implements a conversational habit tracking system using WhatsApp as the primary interface. It allows users to manage habits, record daily activities, and visualize progress in real-time.

## Key Features

### 1. Chat-Based User Interface

* Interactive menu navigation via WhatsApp
* Command-based system (`menu`, `exit`, etc.)
* Conversational UX design

### 2. Habit Management System

* Add and delete habits dynamically
* Session-based categorization (Morning, Afternoon, Night)
* No code modification required for updates

### 3. Daily Tracking Engine

* Track completed habits using numeric input
* Prevent duplicate entries
* Store data by date

### 4. Real-Time Analytics

* Completion percentage
* Visual progress bar (🟢⚪)
* Daily summary (completed vs total habits)

### 5. Persistent Data Storage

* JSON-based storage system
* Historical data tracking per day
* Supports further data analysis

### 6. Time-Based Data Structure

* Each record is indexed by date
* Enables weekly/monthly behavioral analysis

### 7. Session Management

* Uses LocalAuth for persistent login
* No need to re-scan QR code

## Tech Stack

* Node.js
* whatsapp-web.js
* Puppeteer
* JSON (File-based database)

## Use Cases

* Personal productivity tracking
* Habit building and discipline system
* Behavioral data collection
* Foundation for data analytics / data mining projects

## Key Insight

This project demonstrates how automation and data tracking can be combined to build a real-world behavioral monitoring system using messaging platforms.

## Future Improvements

* Data visualization dashboard
* Weekly/monthly analytics
* Machine learning-based habit prediction
* Integration with cloud database
