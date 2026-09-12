-- =============================================================
-- BORROWLAB: Production Seed Data
-- =============================================================

-- -------------------------------------------------------------
-- 1. UNIVERSITIES & DEPARTMENTS
-- -------------------------------------------------------------

INSERT INTO universities (university_id, name, short_name, email_domain, address, is_active) VALUES
(1, 'United International University', 'UIU', 'uiu.ac.bd', 'United City, Madani Avenue, Badda, Dhaka 1212, Bangladesh', true);

INSERT INTO departments (department_id, university_id, name, code, is_active) VALUES
(1, 1, 'Computer Science & Engineering', 'CSE', true),
(2, 1, 'Electrical & Electronic Engineering', 'EEE', true),
(3, 1, 'Data Science', 'DS', true),
(4, 1, 'Civil Engineering', 'CE', true),
(5, 1, 'Bio-Medical Engineering', 'BME', true),
(6, 1, 'Mechanical Engineering', 'ME', true);

-- -------------------------------------------------------------
-- 2. ROLES
-- -------------------------------------------------------------

INSERT INTO roles (role_id, role_name, description) VALUES
(1, 'ADMIN', 'System administrator with full system-wide permissions and analytics access'),
(2, 'MODERATOR', 'Academic lab manager / moderator reviewing damage reports and arbitrating disputes'),
(3, 'STUDENT', 'Verified student borrowing and listing hardware within the academic network');

-- -------------------------------------------------------------
-- 3. USERS
-- Default password for all seeded users: "password123"
-- bcrypt hash for "password123": $2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.
-- -------------------------------------------------------------

INSERT INTO users (user_id, university_id, department_id, student_id, full_name, university_email, password_hash, phone, profile_image_url, trust_score, status, email_verified) VALUES
(1, 1, 1, 'UIU-FAC-001', 'Dr. S. M. Farhan', 'admin@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000001', 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin', 100.00, 'ACTIVE', true),
(2, 1, 2, 'UIU-LAB-042', 'Sarah Khan (Lab Manager)', 'moderator@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000002', 'https://api.dicebear.com/7.x/avataaars/svg?seed=sarah', 100.00, 'ACTIVE', true),
(3, 1, 1, '011191001', 'Tanzim Haque', 'tanzim@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000003', 'https://api.dicebear.com/7.x/avataaars/svg?seed=tanzim', 98.50, 'ACTIVE', true),
(4, 1, 2, '011192015', 'Adnan Sami', 'adnan@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000004', 'https://api.dicebear.com/7.x/avataaars/svg?seed=adnan', 95.00, 'ACTIVE', true),
(5, 1, 1, '011201042', 'Nusrat Jahan', 'nusrat@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000005', 'https://api.dicebear.com/7.x/avataaars/svg?seed=nusrat', 100.00, 'ACTIVE', true),
(6, 1, 2, '011202088', 'Rafid Hossain', 'rafid@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000006', 'https://api.dicebear.com/7.x/avataaars/svg?seed=rafid', 92.00, 'ACTIVE', true),
(7, 1, 1, '011211088', 'Alina Vance', 'alina@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000007', 'https://api.dicebear.com/7.x/avataaars/svg?seed=alina', 99.00, 'ACTIVE', true),
(8, 1, 2, '011212014', 'Marcus Brody', 'marcus@uiu.ac.bd', '$2a$10$/zoNxg3zVGFj08F89XwF3e4aaOSal58kzwIUMeBehBcrifT9G.S0.', '+8801711000008', 'https://api.dicebear.com/7.x/avataaars/svg?seed=marcus', 88.50, 'ACTIVE', true);

-- User Roles
INSERT INTO user_roles (user_id, role_id) VALUES
(1, 1), -- Dr. S. M. Farhan: ADMIN
(1, 2), -- Dr. S. M. Farhan: MODERATOR
(1, 3), -- Dr. S. M. Farhan: STUDENT
(2, 2), -- Sarah Khan: MODERATOR
(2, 3), -- Sarah Khan: STUDENT
(3, 3), -- Tanzim: STUDENT
(4, 3), -- Adnan: STUDENT
(5, 3), -- Nusrat: STUDENT
(6, 3), -- Rafid: STUDENT
(7, 3), -- Alina: STUDENT
(8, 3); -- Marcus: STUDENT

-- -------------------------------------------------------------
-- 4. WALLETS
-- -------------------------------------------------------------

INSERT INTO wallets (wallet_id, user_id, balance, currency, is_active) VALUES
(1, 1, 50000.00, 'BDT', true),
(2, 2, 30000.00, 'BDT', true),
(3, 3, 14500.00, 'BDT', true),
(4, 4, 8200.00, 'BDT', true),
(5, 5, 9500.00, 'BDT', true),
(6, 6, 6800.00, 'BDT', true),
(7, 7, 25000.00, 'BDT', true),
(8, 8, 4200.00, 'BDT', true);

-- -------------------------------------------------------------
-- 5. COMPONENT CATEGORIES (Hierarchical)
-- -------------------------------------------------------------

INSERT INTO component_categories (category_id, parent_category_id, name, description, is_active) VALUES
(1, NULL, 'Test & Measurement', 'Oscilloscopes, multimeters, logic analyzers, and signal generators', true),
(2, NULL, 'Embedded & Computing', 'Microcontrollers, Single Board Computers, and edge AI kits', true),
(3, NULL, 'FPGA & Programmable Logic', 'CPLD, FPGA development boards and programmer interfaces', true),
(4, NULL, 'Robotics & Automation', 'Actuators, motor drivers, LiDAR sensors, and power controllers', true),
(5, NULL, 'Prototyping & Soldering', 'Precision soldering stations, hot air rework, and power supplies', true),
(6, 1, 'Digital Oscilloscopes', 'High-frequency storage and mixed-signal oscilloscopes', true),
(7, 1, 'Logic Analyzers', 'Digital channel bus analysis instruments', true),
(8, 2, 'Edge AI Accelerators', 'GPU and NPU embedded development systems', true);

-- -------------------------------------------------------------
-- 6. COMPONENT CATALOG
-- -------------------------------------------------------------

INSERT INTO component_catalog (component_id, category_id, manufacturer, model, component_name, description, specifications, default_rental_period_days) VALUES
(1, 6, 'Rigol', 'DS1054Z', 'Rigol 50MHz 4-Channel Digital Oscilloscope', 'UltraVision technology digital oscilloscope with 4 analog channels and 12 Mpts memory depth.', 'Bandwidth: 50 MHz, Channels: 4, Sample Rate: 1 GSa/s, Display: 7 inch WVGA TFT', 7),
(2, 3, 'Digilent', 'Basys 3', 'Digilent Basys 3 Artix-7 FPGA Trainer Board', 'Entry-level FPGA board designed for introductory digital logic and Vivado design suite.', 'Xilinx Artix-7 XC7A35T-1CPG236C, 33280 logic cells, 16 switches, 16 LEDs, 4-digit 7-segment display', 14),
(3, 8, 'NVIDIA', 'Jetson Orin Nano 8GB', 'NVIDIA Jetson Orin Nano Developer Kit (8GB)', 'Compact, powerful edge AI system capable of up to 40 TOPS of AI performance.', 'GPU: 1024-core NVIDIA Ampere, CPU: 6-core Arm Cortex-A78AE, Memory: 8GB 128-bit LPDDR5, Storage: M.2 NVMe slot', 14),
(4, 2, 'Raspberry Pi Foundation', 'Pi 5 8GB', 'Raspberry Pi 5 (8GB RAM) with Active Cooler', 'Latest generation flagship quad-core 64-bit SBC with PCI Express 2.0 interface.', 'Broadcom BCM2712 2.4GHz quad-core 64-bit Arm Cortex-A76, 8GB LPDDR4X-4267 SDRAM, Dual 4Kp60 HDMI', 7),
(5, 7, 'Saleae', 'Logic 8', 'Saleae Logic 8 USB Logic Analyzer', '8-channel logic analyzer and protocol decoder for digital debugging (SPI, I2C, UART, CAN).', 'Channels: 8 digital/analog, Max Sample Rate: 100 MS/s digital, 10 MS/s analog, USB 3.0 interface', 7),
(6, 5, 'Hakko', 'FX-888D', 'Hakko FX-888D Digital Soldering Station', 'Reliable digital soldering station with selectable preset temperatures and rapid thermal recovery.', 'Power Consumption: 70W, Temperature range: 200°C to 480°C, Ceramic heating element', 7),
(7, 5, 'Siglent', 'SPD3303X-E', 'Siglent Programmable Linear DC Power Supply', 'Triple output precision power supply with independent isolated outputs and USB connectivity.', 'Outputs: CH1/CH2 (0-32V/0-3.2A), CH3 (2.5V, 3.3V, 5V/3.2A), Total Power: 220W, Resolution: 10mV/10mA', 7),
(8, 4, 'Slamtec', 'RPLIDAR A1M8', 'Slamtec 360-degree 2D Laser Range Scanner', 'Laser triangulation based 360 degree 12m range LiDAR scanner for robot SLAM navigation.', 'Range: 0.15m - 12m, Scan Rate: 5.5Hz - 10Hz, Sample Rate: 8000 times/s, Angular Resolution: 1 degree', 7),
(9, 2, 'STMicroelectronics', 'NUCLEO-F401RE', 'STM32F401RE Nucleo-64 Development Board', 'ARM Cortex-M4 development board with Arduino Uno V3 and ST morpho connectivity.', 'MCU: STM32F401RET6 84 MHz, 512 KB Flash, 96 KB SRAM, Onboard ST-LINK/V2-1 debugger/programmer', 14),
(10, 3, 'Terasic', 'DE10-Lite', 'Intel MAX 10 FPGA DE10-Lite Development Board', 'Versatile digital logic learning board featuring Intel MAX 10 FPGA with integrated ADC.', 'FPGA: 10M50DAF484C7G (50K LEs), 64MB SDRAM, VGA output, Accelerometer, Arduino expansion header', 14);

-- -------------------------------------------------------------
-- 7. PHYSICAL INVENTORY
-- -------------------------------------------------------------

INSERT INTO inventory (inventory_id, component_id, owner_id, inventory_code, serial_number, condition, status, replacement_value, purchase_date, current_location, description, image_url) VALUES
(1, 1, 4, 'INV-UIU-OSC-01', 'DS1ZA194801124', 'EXCELLENT', 'AVAILABLE', 42000.00, '2023-01-15', 'UIU Hardware Lab Room 412', 'Calibrated in Dec 2023. Pristine condition with original probes.', 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80'),
(2, 2, 3, 'INV-UIU-FPG-01', 'BSY3-2022-8819', 'EXCELLENT', 'RENTED', 28000.00, '2022-11-20', 'UIU CSE Embedded Systems Lab 506', 'Tested with Vivado 2023.2. All 16 switches and 7-segment displays verified working.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80'),
(3, 3, 3, 'INV-UIU-JET-01', 'ORIN-8G-099231', 'EXCELLENT', 'AVAILABLE', 55000.00, '2023-08-10', 'UIU AI & Robotics Lab 310', 'Equipped with 512GB Samsung 980 NVMe SSD and official 19V power supply.', 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80'),
(4, 4, 5, 'INV-UIU-PI5-01', 'RPI5-8GB-44120', 'GOOD', 'AVAILABLE', 12500.00, '2024-01-05', 'UIU Student Lounge Badda', 'Includes active cooler and 64GB SanDisk Extreme MicroSD card.', 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'),
(5, 5, 4, 'INV-UIU-LOG-01', 'SAL-L8-5002199', 'EXCELLENT', 'AVAILABLE', 35000.00, '2023-05-12', 'UIU Circuit Bench EEE-2', 'Original wire harness and micro test hooks included in zipper pouch.', 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80'),
(6, 6, 6, 'INV-UIU-SOL-01', 'HAK-FX88-02831', 'GOOD', 'AVAILABLE', 14000.00, '2022-09-18', 'UIU Hardware Workshop Bench 4', 'Includes chisel tip and conical tip. Heat-resistant sponge replaced.', 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80'),
(7, 7, 4, 'INV-UIU-PWR-01', 'SIG-SPD-992301', 'FAIR', 'MAINTENANCE', 38000.00, '2021-04-10', 'UIU Power Electronics Bench', 'Channel 2 current regulation potentiometer undergoing recalibration.', NULL),
(8, 8, 6, 'INV-UIU-LID-01', 'RPL-A1-7729103', 'EXCELLENT', 'DISPUTED', 16500.00, '2023-03-22', 'UIU Robotics Arena Room 204', 'USB adapter cable reported damaged upon return.', 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80'),
(9, 2, 5, 'INV-UIU-FPG-02', 'BSY3-2023-1102', 'GOOD', 'AVAILABLE', 28000.00, '2023-04-15', 'UIU CSE Project Room 3', 'Second Basys 3 board. Micro-USB cable included.', NULL),
(10, 10, 3, 'INV-UIU-FPG-03', 'DE10-LT-99120', 'EXCELLENT', 'AVAILABLE', 18000.00, '2023-09-01', 'UIU Digital Logic Lab 402', 'Includes USB Blaster cable and acrylic cover.', NULL);

-- -------------------------------------------------------------
-- 8. INVENTORY ACCESSORIES
-- -------------------------------------------------------------

INSERT INTO inventory_accessories (accessory_id, inventory_id, accessory_name, quantity, replacement_value, is_required) VALUES
(1, 1, 'Rigol PVP2150 150MHz Passive Probes', 4, 3200.00, true),
(2, 1, 'Standard 3-Pin Power Cable', 1, 350.00, true),
(3, 2, 'Micro-USB High-Speed Programming Cable', 1, 250.00, true),
(4, 3, 'Official 19V 45W DC Power Adapter', 1, 3500.00, true),
(5, 3, 'Samsung 980 512GB PCIe 3.0 NVMe SSD', 1, 5500.00, true),
(6, 5, 'Saleae 8-Channel Wire Harness with Ground Leads', 1, 2800.00, true),
(7, 5, 'Ultra-Fine Micro Test Clip Hooks', 16, 1600.00, true),
(8, 6, 'Brass Wire Tip Cleaner with Rosin Flux', 1, 450.00, false),
(9, 8, 'PWM Driver & USB Serial Adapter Board', 1, 1500.00, true);

-- -------------------------------------------------------------
-- 9. LISTINGS & IMAGES
-- -------------------------------------------------------------

INSERT INTO listings (listing_id, inventory_id, owner_id, weekly_rent, minimum_duration_days, maximum_duration_days, listing_title, description, pickup_information, status) VALUES
(1, 1, 4, 850.00, 3, 28, 'Rigol DS1054Z 50MHz 4-Channel Digital Oscilloscope with 4 Probes', 'Fully calibrated 4-channel oscilloscope ideal for analog electronics, micro-signal analysis, and embedded system debugging. Kept in anti-static storage.', 'Pickup at EEE Building Room 304 between 2:00 PM and 5:00 PM weekdays.', 'ACTIVE'),
(2, 2, 3, 650.00, 7, 30, 'Digilent Basys 3 Artix-7 FPGA Development Board', 'Clean Basys 3 board for Digital Logic Design (CSE 206 / EEE 304). Pre-tested with Xilinx Vivado. Micro-USB cable provided.', 'Pickup at CSE Building Room 402 or Central Library ground floor.', 'ACTIVE'),
(3, 3, 3, 1400.00, 7, 45, 'NVIDIA Jetson Orin Nano (8GB) Edge AI Supercomputer Developer Kit', 'Top-of-the-line edge AI kit for deep learning thesis/capstone projects (YOLOv8, TensorRT, ROS 2). Fast 512GB NVMe preloaded with JetPack 5.1.', 'Direct handover at ECE Building Room 402. Please bring your student ID.', 'ACTIVE'),
(4, 4, 5, 400.00, 3, 21, 'Raspberry Pi 5 (8GB RAM) with Active Cooler & 64GB SD', 'Raspberry Pi 5 with active heatsink cooler and 64GB high endurance card. Perfect for IoT gateways, robotics servers, and networking labs.', 'Pickup at Shahid Minar Road Dorm Gate or CSE Department Cafe.', 'ACTIVE'),
(5, 5, 4, 600.00, 3, 14, 'Saleae Logic 8 USB Logic Analyzer & Protocol Decoder', 'Essential diagnostic tool for debugging I2C, SPI, UART, and PWM signals. Fast 100 MS/s capture rate.', 'Pickup at EEE Building Ground Floor reception desk.', 'ACTIVE'),
(6, 6, 6, 350.00, 2, 14, 'Hakko FX-888D Precision Digital Temperature Soldering Station', 'Original Japanese Hakko FX-888D with rapid thermal recovery. Safe for fine SMD and through-hole soldering.', 'Pickup at ME Department Machine Shop Counter.', 'ACTIVE'),
(7, 8, 6, 750.00, 5, 21, 'Slamtec RPLIDAR A1M8 360 Laser Scanner for Autonomous SLAM', '360 degree 12m scanning range LiDAR. Works seamlessly with ROS 2 Humble/Iron packages.', 'Pickup at Robotics Lab.', 'ACTIVE'),
(8, 9, 5, 600.00, 7, 28, 'Digilent Basys 3 Artix-7 FPGA Board (Unit 2)', 'Second unit available for digital logic course experiments. Includes original Digilent carton and cable.', 'Pickup at CSE Department Office.', 'ACTIVE'),
(9, 10, 3, 500.00, 7, 30, 'Intel MAX 10 DE10-Lite FPGA Board with ADC', 'Intel DE10-Lite with MAX 10 FPGA and integrated ADC for reconfigurable computing labs.', 'Pickup at ECE Building Room 402.', 'ACTIVE');

INSERT INTO listing_images (listing_image_id, listing_id, image_url, display_order) VALUES
(1, 1, 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80', 1),
(2, 2, 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80', 1),
(3, 3, 'https://images.unsplash.com/photo-1629654297299-c8506221ca97?auto=format&fit=crop&w=800&q=80', 1),
(4, 4, 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80', 1),
(5, 5, 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80', 1),
(6, 6, 'https://images.unsplash.com/photo-1581092162384-8987c1d64718?auto=format&fit=crop&w=800&q=80', 1),
(7, 7, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&w=800&q=80', 1);

-- -------------------------------------------------------------
-- 10. RESERVATIONS
-- -------------------------------------------------------------

INSERT INTO reservations (reservation_id, listing_id, borrower_id, start_date, end_date, status, created_at, expires_at) VALUES
(1, 1, 3, CURRENT_DATE + 3, CURRENT_DATE + 10, 'ACTIVE', NOW() - INTERVAL '1 day', NOW() + INTERVAL '2 days'),
(2, 4, 4, CURRENT_DATE + 5, CURRENT_DATE + 12, 'ACTIVE', NOW() - INTERVAL '12 hours', NOW() + INTERVAL '3 days');

-- -------------------------------------------------------------
-- 11. RENTALS & RENTAL STATUS HISTORY
-- -------------------------------------------------------------

-- Rental 1: COMPLETED (Basys 3 rented by Nusrat from Tanzim, returned cleanly)
INSERT INTO rentals (rental_id, listing_id, inventory_id, owner_id, borrower_id, requested_at, approved_at, start_date, due_date, returned_at, weekly_rent, rental_fee, security_deposit, late_penalty, status, borrower_condition_notes, owner_condition_notes) VALUES
(1, 2, 2, 3, 5, '2024-01-10 10:00:00', '2024-01-10 14:00:00', '2024-01-11', '2024-01-18', '2024-01-18 16:30:00', 650.00, 650.00, 3000.00, 0.00, 'COMPLETED', 'Board received in original bubble wrap.', 'Returned on time and in perfect condition.');

INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason, changed_at) VALUES
(1, NULL, 'REQUESTED', 5, 'Borrower requested rental for digital logic project', '2024-01-10 10:00:00'),
(1, 'REQUESTED', 'APPROVED', 3, 'Owner approved the request', '2024-01-10 14:00:00'),
(1, 'APPROVED', 'ACTIVE', 5, 'Deposit locked and hardware collected', '2024-01-11 09:30:00'),
(1, 'ACTIVE', 'RETURN_PENDING', 5, 'Borrower initiated return handover', '2024-01-18 15:45:00'),
(1, 'RETURN_PENDING', 'RETURNED', 3, 'Owner inspected and accepted hardware', '2024-01-18 16:30:00'),
(1, 'RETURNED', 'COMPLETED', 3, 'Escrow released and rental marked completed', '2024-01-18 16:35:00');

-- Escrow for Rental 1 (RELEASED)
INSERT INTO escrows (escrow_id, rental_id, borrower_id, owner_id, original_amount, held_amount, released_amount, deducted_amount, status, locked_at, released_at) VALUES
(1, 1, 5, 3, 3000.00, 0.00, 3000.00, 0.00, 'RELEASED', '2024-01-11 09:30:00', '2024-01-18 16:35:00');

-- Rental 2: ACTIVE (Basys 3 rented by Rafid from Tanzim)
INSERT INTO rentals (rental_id, listing_id, inventory_id, owner_id, borrower_id, requested_at, approved_at, start_date, due_date, returned_at, weekly_rent, rental_fee, security_deposit, late_penalty, status, borrower_condition_notes, owner_condition_notes) VALUES
(2, 2, 2, 3, 6, NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', CURRENT_DATE - 2, CURRENT_DATE + 5, NULL, 650.00, 650.00, 3000.00, 0.00, 'ACTIVE', 'Received with micro-USB cable.', 'Given in pristine condition.');

INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason, changed_at) VALUES
(2, NULL, 'REQUESTED', 6, 'Requested for CSE project lab', NOW() - INTERVAL '3 days'),
(2, 'REQUESTED', 'APPROVED', 3, 'Owner accepted request', NOW() - INTERVAL '2 days'),
(2, 'APPROVED', 'ACTIVE', 6, 'Hardware picked up and escrow locked', NOW() - INTERVAL '2 days');

-- Escrow for Rental 2 (HELD)
INSERT INTO escrows (escrow_id, rental_id, borrower_id, owner_id, original_amount, held_amount, released_amount, deducted_amount, status, locked_at) VALUES
(2, 2, 6, 3, 3000.00, 3000.00, 0.00, 0.00, 'HELD', NOW() - INTERVAL '2 days');

-- Rental 3: DISPUTED (LiDAR rented by Adnan from Rafid; damaged cable reported)
INSERT INTO rentals (rental_id, listing_id, inventory_id, owner_id, borrower_id, requested_at, approved_at, start_date, due_date, returned_at, weekly_rent, rental_fee, security_deposit, late_penalty, status, borrower_condition_notes, owner_condition_notes) VALUES
(3, 7, 8, 6, 4, NOW() - INTERVAL '10 days', NOW() - INTERVAL '9 days', CURRENT_DATE - 9, CURRENT_DATE - 2, NOW() - INTERVAL '1 day', 750.00, 750.00, 4000.00, 0.00, 'DISPUTED', 'Used on TurtleBot chassis indoors.', 'Returned with broken USB adapter board.');

INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason, changed_at) VALUES
(3, NULL, 'REQUESTED', 4, 'Robotics mapping experiment', NOW() - INTERVAL '10 days'),
(3, 'REQUESTED', 'APPROVED', 6, 'Approved by owner', NOW() - INTERVAL '9 days'),
(3, 'APPROVED', 'ACTIVE', 4, 'Handover complete', NOW() - INTERVAL '9 days'),
(3, 'ACTIVE', 'RETURN_PENDING', 4, 'Returned to owner', NOW() - INTERVAL '1 day'),
(3, 'RETURN_PENDING', 'DISPUTED', 6, 'Owner disputed due to cracked connector', NOW() - INTERVAL '1 day');

-- Escrow for Rental 3 (FROZEN)
INSERT INTO escrows (escrow_id, rental_id, borrower_id, owner_id, original_amount, held_amount, released_amount, deducted_amount, status, locked_at) VALUES
(3, 3, 4, 6, 4000.00, 4000.00, 0.00, 0.00, 'FROZEN', NOW() - INTERVAL '9 days');

-- Rental 4: COMPLETED (Jetson Orin Nano rented by Marcus from Tanzim; completed and ready for unreviewed testing)
INSERT INTO rentals (rental_id, listing_id, inventory_id, owner_id, borrower_id, requested_at, approved_at, start_date, due_date, returned_at, weekly_rent, rental_fee, security_deposit, late_penalty, status, borrower_condition_notes, owner_condition_notes) VALUES
(4, 3, 3, 3, 8, NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days', CURRENT_DATE - 13, CURRENT_DATE - 3, NOW() - INTERVAL '3 days', 1400.00, 1400.00, 5000.00, 0.00, 'COMPLETED', 'Hardware collected with original power supply and NVMe.', 'Returned on time in spotless working order.');

INSERT INTO rental_status_history (rental_id, old_status, new_status, changed_by, reason, changed_at) VALUES
(4, NULL, 'REQUESTED', 8, 'Requested for AI capstone project training', NOW() - INTERVAL '14 days'),
(4, 'REQUESTED', 'APPROVED', 3, 'Owner approved request', NOW() - INTERVAL '13 days'),
(4, 'APPROVED', 'ACTIVE', 8, 'Deposit locked and Jetson collected', NOW() - INTERVAL '13 days'),
(4, 'ACTIVE', 'RETURN_PENDING', 8, 'Borrower returned kit to owner', NOW() - INTERVAL '3 days'),
(4, 'RETURN_PENDING', 'RETURNED', 3, 'Owner verified hardware operation', NOW() - INTERVAL '3 days'),
(4, 'RETURNED', 'COMPLETED', 3, 'Escrow settled and rental marked completed', NOW() - INTERVAL '3 days');

-- Escrow for Rental 4 (RELEASED)
INSERT INTO escrows (escrow_id, rental_id, borrower_id, owner_id, original_amount, held_amount, released_amount, deducted_amount, status, locked_at, released_at) VALUES
(4, 4, 8, 3, 5000.00, 0.00, 5000.00, 0.00, 'RELEASED', NOW() - INTERVAL '13 days', NOW() - INTERVAL '3 days');

-- Return records (inserted after rentals 1-4 exist)
INSERT INTO returns (return_id, rental_id, received_by, returned_at, condition_after_return, damage_found, missing_accessories, return_notes, owner_confirmed, confirmed_at) VALUES
(1, 1, 3, '2024-01-18 16:30:00', 'EXCELLENT', false, false, 'Hardware returned in exact same condition. All switches operational.', true, '2024-01-18 16:35:00'),
(2, 3, 6, NOW() - INTERVAL '1 day', 'DAMAGED', true, false, 'USB UART daughterboard connector was cracked and loose upon handover.', true, NOW() - INTERVAL '1 day'),
(3, 4, 3, NOW() - INTERVAL '3 days', 'EXCELLENT', false, false, 'Jetson Orin Nano returned in pristine condition with all accessories.', true, NOW() - INTERVAL '3 days');

-- Damage report for Rental 3
INSERT INTO damage_reports (damage_report_id, rental_id, inventory_id, reported_by, damage_type, description, estimated_cost, approved_cost, status, reported_at) VALUES
(1, 3, 8, 6, 'PHYSICAL_DAMAGE', 'USB UART daughterboard connector was cracked and pins bent upon return. Replacement adapter needed.', 1500.00, NULL, 'UNDER_REVIEW', NOW() - INTERVAL '1 day');

INSERT INTO damage_evidence (evidence_id, damage_report_id, uploaded_by, file_url, description) VALUES
(1, 1, 6, 'https://images.unsplash.com/photo-1581092335397-9583fe92d232?auto=format&fit=crop&w=800&q=80', 'Photograph showing cracked PCB header on the USB daughterboard.');

-- Dispute for Rental 3
INSERT INTO disputes (dispute_id, rental_id, opened_by, against_user_id, reason, description, requested_amount, status, opened_at) VALUES
(1, 3, 6, 4, 'DAMAGE', 'Borrower returned the LiDAR with a cracked USB interface adapter. Requesting 1,500 BDT deduction from security deposit.', 1500.00, 'UNDER_REVIEW', NOW() - INTERVAL '20 hours');

INSERT INTO dispute_messages (message_id, dispute_id, sender_id, message, created_at) VALUES
(1, 1, 6, 'The adapter daughterboard header was detached when I received it back. Here is the photo in the damage report.', NOW() - INTERVAL '20 hours'),
(2, 1, 4, 'The connector felt somewhat loose during connection on day 1. I did not drop the board. Happy to let the moderator inspect.', NOW() - INTERVAL '16 hours'),
(3, 1, 2, 'Moderator Note: I have reviewed the photo and the inventory accession notes. Inspecting repair cost with the lab technician.', NOW() - INTERVAL '10 hours');

-- -------------------------------------------------------------
-- 11. FINANCIAL LEDGER (WALLET TRANSACTIONS & ESCROW TRANSACTIONS)
-- -------------------------------------------------------------

-- Seed transactions for Rental 1
INSERT INTO wallet_transactions (wallet_transaction_id, wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, created_at, completed_at) VALUES
(1, 5, 1, NULL, 'RENTAL_PAYMENT', 650.00, 'COMPLETED', 'TX-RENT-PAY-001', 'Rental payment for Basys 3 FPGA', '2024-01-11 09:30:00', '2024-01-11 09:30:00'),
(2, 5, 1, 1, 'ESCROW_LOCK', 3000.00, 'COMPLETED', 'TX-ESC-LOCK-001', 'Security deposit lock for Basys 3 FPGA', '2024-01-11 09:30:00', '2024-01-11 09:30:00'),
(3, 5, 1, 1, 'ESCROW_RELEASE', 3000.00, 'COMPLETED', 'TX-ESC-REL-001', 'Security deposit refund after successful return', '2024-01-18 16:35:00', '2024-01-18 16:35:00'),
(4, 3, 1, NULL, 'OWNER_EARNING', 650.00, 'COMPLETED', 'TX-OWNER-EARN-001', 'Rental payout for Basys 3 FPGA', '2024-01-18 16:35:00', '2024-01-18 16:35:00');

INSERT INTO escrow_transactions (escrow_transaction_id, escrow_id, transaction_type, amount, performed_by, reference_code, description, created_at) VALUES
(1, 1, 'ESCROW_LOCK', 3000.00, 5, 'ETX-LOCK-001', 'Locked security deposit into escrow', '2024-01-11 09:30:00'),
(2, 1, 'ESCROW_RELEASE', 3000.00, 3, 'ETX-REL-001', 'Released security deposit back to borrower', '2024-01-18 16:35:00');

-- Seed transactions for Rental 2
INSERT INTO wallet_transactions (wallet_transaction_id, wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, created_at, completed_at) VALUES
(5, 6, 2, NULL, 'RENTAL_PAYMENT', 650.00, 'COMPLETED', 'TX-RENT-PAY-002', 'Rental payment for Basys 3 FPGA', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days'),
(6, 6, 2, 2, 'ESCROW_LOCK', 3000.00, 'COMPLETED', 'TX-ESC-LOCK-002', 'Security deposit locked into escrow', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days');

INSERT INTO escrow_transactions (escrow_transaction_id, escrow_id, transaction_type, amount, performed_by, reference_code, description, created_at) VALUES
(3, 2, 'ESCROW_LOCK', 3000.00, 6, 'ETX-LOCK-002', 'Locked security deposit for active rental', NOW() - INTERVAL '2 days');

-- Seed transactions for Rental 4
INSERT INTO wallet_transactions (wallet_transaction_id, wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, created_at, completed_at) VALUES
(10, 8, 4, NULL, 'RENTAL_PAYMENT', 1400.00, 'COMPLETED', 'TX-RENT-PAY-004', 'Rental payment for Jetson Orin Nano', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
(11, 8, 4, 4, 'ESCROW_LOCK', 5000.00, 'COMPLETED', 'TX-ESC-LOCK-004', 'Security deposit lock for Jetson Orin Nano', NOW() - INTERVAL '13 days', NOW() - INTERVAL '13 days'),
(12, 8, 4, 4, 'ESCROW_RELEASE', 5000.00, 'COMPLETED', 'TX-ESC-REL-004', 'Security deposit refund after successful return', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days'),
(13, 3, 4, NULL, 'OWNER_EARNING', 1400.00, 'COMPLETED', 'TX-OWNER-EARN-004', 'Rental payout for Jetson Orin Nano', NOW() - INTERVAL '3 days', NOW() - INTERVAL '3 days');

INSERT INTO escrow_transactions (escrow_transaction_id, escrow_id, transaction_type, amount, performed_by, reference_code, description, created_at) VALUES
(4, 4, 'ESCROW_LOCK', 5000.00, 8, 'ETX-LOCK-004', 'Locked security deposit into escrow', NOW() - INTERVAL '13 days'),
(5, 4, 'ESCROW_RELEASE', 5000.00, 3, 'ETX-REL-004', 'Released security deposit back to borrower', NOW() - INTERVAL '3 days');


-- Seed deposit simulation transactions
INSERT INTO wallet_transactions (wallet_transaction_id, wallet_id, rental_id, escrow_id, transaction_type, amount, status, reference_code, description, created_at, completed_at) VALUES
(7, 3, NULL, NULL, 'WALLET_DEPOSIT', 10000.00, 'COMPLETED', 'TX-DEP-001', 'Simulated campus card topup', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(8, 4, NULL, NULL, 'WALLET_DEPOSIT', 12000.00, 'COMPLETED', 'TX-DEP-002', 'Simulated campus card topup', '2024-01-01 10:00:00', '2024-01-01 10:00:00'),
(9, 5, NULL, NULL, 'WALLET_DEPOSIT', 10000.00, 'COMPLETED', 'TX-DEP-003', 'Simulated campus card topup', '2024-01-01 10:00:00', '2024-01-01 10:00:00');

-- -------------------------------------------------------------
-- 12. REVIEWS
-- -------------------------------------------------------------

INSERT INTO reviews (review_id, rental_id, reviewer_id, reviewee_id, rating, comment, status) VALUES
(1, 1, 5, 3, 5, 'Tanzim was extremely helpful and punctual. Basys 3 worked flawlessly for my digital lab assignment. Highly recommended lender!', 'PUBLISHED'),
(2, 1, 3, 5, 5, 'Nusrat took great care of the hardware. Returned right on time and in immaculate shape. Would happily lend to her anytime.', 'PUBLISHED');

-- -------------------------------------------------------------
-- 13. WAITLIST
-- -------------------------------------------------------------

INSERT INTO waitlist (waitlist_id, component_id, borrower_id, requested_start_date, requested_duration_days, status, joined_at) VALUES
(1, 3, 6, CURRENT_DATE + 7, 14, 'WAITING', NOW() - INTERVAL '4 days'),
(2, 3, 4, CURRENT_DATE + 10, 7, 'WAITING', NOW() - INTERVAL '2 days'),
(3, 1, 5, CURRENT_DATE + 5, 7, 'WAITING', NOW() - INTERVAL '1 day');

-- -------------------------------------------------------------
-- 14. NOTIFICATIONS
-- -------------------------------------------------------------

INSERT INTO notifications (notification_id, user_id, notification_type, title, message, related_rental_id, related_dispute_id, is_read, created_at) VALUES
(1, 3, 'RENTAL_REQUEST', 'New Rental Request', 'Rafid requested to rent your Digilent Basys 3 Artix-7 FPGA.', 2, NULL, true, NOW() - INTERVAL '3 days'),
(2, 6, 'RENTAL_APPROVED', 'Rental Approved', 'Tanzim approved your request for Digilent Basys 3 Artix-7 FPGA.', 2, NULL, true, NOW() - INTERVAL '2 days'),
(3, 6, 'RENTAL_START', 'Rental Activated', 'Your rental has started. Due date is set to 7 days from now.', 2, NULL, false, NOW() - INTERVAL '2 days'),
(4, 4, 'DISPUTE_OPENED', 'Dispute Notice', 'A dispute was opened regarding your return of RPLIDAR A1M8.', 3, 1, false, NOW() - INTERVAL '20 hours'),
(5, 2, 'DISPUTE_OPENED', 'Moderator Dispute Alert', 'New dispute opened for Rental #3 by Rafid Hossain against Adnan Sami.', 3, 1, false, NOW() - INTERVAL '20 hours');

-- -------------------------------------------------------------
-- 15. AUDIT LOGS
-- -------------------------------------------------------------

INSERT INTO audit_logs (audit_log_id, actor_user_id, action, entity_type, entity_id, old_values, new_values, ip_address, created_at) VALUES
(1, 1, 'INSERT', 'users', 3, NULL, '{"full_name": "Tanzim Haque", "email": "tanzim@uiu.ac.bd"}', '127.0.0.1', '2024-01-01 09:00:00'),
(2, 3, 'STATUS_CHANGE', 'inventory', 2, '{"status": "AVAILABLE"}', '{"status": "RENTED"}', '127.0.0.1', NOW() - INTERVAL '2 days'),
(3, 6, 'DISPUTE_ACTION', 'disputes', 1, NULL, '{"reason": "DAMAGE", "requested_amount": 1500}', '127.0.0.1', NOW() - INTERVAL '20 hours');

-- -------------------------------------------------------------
-- 16. MAINTENANCE RECORDS
-- -------------------------------------------------------------

INSERT INTO maintenance_records (maintenance_id, inventory_id, reported_by, maintenance_type, description, cost, started_at, completed_at, notes) VALUES
(1, 7, 4, 'Calibration & Potentiometer Fix', 'Periodic calibration of channel 2 current regulator. Potentiometer cleaned with contact cleaner.', 800.00, NOW() - INTERVAL '5 days', NULL, 'Awaiting final bench test.');

-- Reset sequence values so future inserts don't collide
SELECT setval('universities_university_id_seq', COALESCE((SELECT MAX(university_id) FROM universities), 1));
SELECT setval('departments_department_id_seq', COALESCE((SELECT MAX(department_id) FROM departments), 1));
SELECT setval('roles_role_id_seq', COALESCE((SELECT MAX(role_id) FROM roles), 1));
SELECT setval('users_user_id_seq', COALESCE((SELECT MAX(user_id) FROM users), 1));
SELECT setval('wallets_wallet_id_seq', COALESCE((SELECT MAX(wallet_id) FROM wallets), 1));
SELECT setval('component_categories_category_id_seq', COALESCE((SELECT MAX(category_id) FROM component_categories), 1));
SELECT setval('component_catalog_component_id_seq', COALESCE((SELECT MAX(component_id) FROM component_catalog), 1));
SELECT setval('inventory_inventory_id_seq', COALESCE((SELECT MAX(inventory_id) FROM inventory), 1));
SELECT setval('inventory_accessories_accessory_id_seq', COALESCE((SELECT MAX(accessory_id) FROM inventory_accessories), 1));
SELECT setval('listings_listing_id_seq', COALESCE((SELECT MAX(listing_id) FROM listings), 1));
SELECT setval('listing_images_listing_image_id_seq', COALESCE((SELECT MAX(listing_image_id) FROM listing_images), 1));
SELECT setval('reservations_reservation_id_seq', COALESCE((SELECT MAX(reservation_id) FROM reservations), 1));
SELECT setval('rentals_rental_id_seq', COALESCE((SELECT MAX(rental_id) FROM rentals), 1));
SELECT setval('rental_status_history_history_id_seq', COALESCE((SELECT MAX(history_id) FROM rental_status_history), 1));
SELECT setval('returns_return_id_seq', COALESCE((SELECT MAX(return_id) FROM returns), 1));
SELECT setval('escrows_escrow_id_seq', COALESCE((SELECT MAX(escrow_id) FROM escrows), 1));
SELECT setval('wallet_transactions_wallet_transaction_id_seq', COALESCE((SELECT MAX(wallet_transaction_id) FROM wallet_transactions), 1));
SELECT setval('escrow_transactions_escrow_transaction_id_seq', COALESCE((SELECT MAX(escrow_transaction_id) FROM escrow_transactions), 1));
SELECT setval('damage_reports_damage_report_id_seq', COALESCE((SELECT MAX(damage_report_id) FROM damage_reports), 1));
SELECT setval('damage_evidence_evidence_id_seq', COALESCE((SELECT MAX(evidence_id) FROM damage_evidence), 1));
SELECT setval('disputes_dispute_id_seq', COALESCE((SELECT MAX(dispute_id) FROM disputes), 1));
SELECT setval('dispute_messages_message_id_seq', COALESCE((SELECT MAX(message_id) FROM dispute_messages), 1));
SELECT setval('waitlist_waitlist_id_seq', COALESCE((SELECT MAX(waitlist_id) FROM waitlist), 1));
SELECT setval('reviews_review_id_seq', COALESCE((SELECT MAX(review_id) FROM reviews), 1));
SELECT setval('notifications_notification_id_seq', COALESCE((SELECT MAX(notification_id) FROM notifications), 1));
SELECT setval('audit_logs_audit_log_id_seq', COALESCE((SELECT MAX(audit_log_id) FROM audit_logs), 1));
SELECT setval('maintenance_records_maintenance_id_seq', COALESCE((SELECT MAX(maintenance_id) FROM maintenance_records), 1));
