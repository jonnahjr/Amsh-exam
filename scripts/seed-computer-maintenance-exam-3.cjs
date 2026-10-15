const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const questionsData = [
  // Section 1: Advanced Hardware Diagnostics & Motherboard/Power Systems
  {
    text: "A technician at Level III is troubleshooting a desktop that intermittently shuts down under heavy processing loads. The power supply unit (PSU) voltages test normal under no-load conditions using a digital multimeter, but the 12V rail drops to 10.2V when the CPU and GPU are stressed. What is the most precise technical conclusion?",
    options: [
      "The motherboard voltage regulator module (VRM) has shorted capacitors.",
      "The PSU suffers from poor regulation/dynamic load instability and must be replaced.",
      "The CPU thermal throttling threshold is incorrectly set in the BIOS.",
      "The RAM modules are drawing excessive transient current, triggering OCP."
    ],
    correct: [1],
    explanation: "A 12V rail dropping to 10.2V under load is well below the ATX specification tolerance (±5%, minimum 11.4V), indicating power supply voltage regulation failure under dynamic load."
  },
  {
    text: "While inspecting a workstation motherboard during complex maintenance, you notice bulging electrolytic capacitors near the CPU socket and a faint high-pitched squealing sound when the system attempts to POST. What does this indicate?",
    options: [
      "EEPROM corruption requiring a flash write.",
      "Imminent failure of the smoothing filters in the VRM circuit due to electrolyte leakage/degradation.",
      "CMOS battery depletion causing incorrect frequency multipliers.",
      "Northbridge overheating due to failed passive heatsink thermal paste."
    ],
    correct: [1],
    explanation: "Bulging capacitors and high-pitched coil squeal/whine signify electrolytic degradation and failure in the VRM smoothing circuit."
  },
  {
    text: "A user reports that their PC retains the correct system time when turned off, but all custom BIOS configuration settings (such as boot order and XMP profiles) revert to factory defaults every time the AC power cord is unplugged. What is the root cause?",
    options: [
      "A dead CR2032 CMOS coin cell battery.",
      "A corrupted NVRAM/SPI flash descriptor region on the motherboard.",
      "A short-circuited front-panel power switch wire.",
      "Failure of the Southbridge RTC crystal oscillator circuit."
    ],
    correct: [0],
    explanation: "A dead CR2032 CMOS coin cell battery prevents CMOS RAM from retaining volatile settings (boot order, XMP profiles) once AC mains power is removed."
  },
  {
    text: "When performing complex hardware maintenance on a high-end workstation, you encounter a \"POST code 00\" or CPU initialization freeze. Before declaring the processor dead, what critical component-level check should a Level III technician perform?",
    options: [
      "Flash the BIOS using a bootable USB DOS utility.",
      "Inspect the LGA socket for bent pins and verify proper torque on the CPU cooler mounting pressure.",
      "Replace the thermal compound with liquid metal.",
      "Swap the primary NVMe SSD to a secondary PCIe slot."
    ],
    correct: [1],
    explanation: "POST code 00 or early CPU freeze is frequently caused by bent pins in the LGA socket or uneven cooler mounting pressure preventing critical pin contact."
  },
  {
    text: "A technician replaces a faulty PC power supply with a third-party modular PSU, reusing the modular cables from the old brand. Upon powering on, the motherboard and connected SSDs emit smoke. Why did this catastrophic failure occur?",
    options: [
      "Modular cable pinouts on the PSU side are proprietary and non-standardized across manufacturers, causing voltage rail inversion (e.g., 12V sent to ground).",
      "The wattage rating of the old cables exceeded the new PSU's amperage capacity.",
      "The lack of an Earth ground pin on the modular harness caused a ground loop.",
      "Failure to discharge the CMOS capacitor prior to cable attachment."
    ],
    correct: [0],
    explanation: "Modular PSU cable pinouts are proprietary on the power supply side; mixing cables from different brands/models often causes catastrophic voltage rail reversal."
  },
  {
    text: "During a routine maintenance check, a desktop exhibits erratic USB device disconnection whenever a heavy external USB 3.0 hard drive is plugged into the front panel ports. Rear ports work fine. What is the most likely cause?",
    options: [
      "Outdated xHCI host controller drivers in the operating system.",
      "Voltage drop/excessive resistance along the thin internal front-panel USB header cable or insufficient power delivery from the 5V standby rail.",
      "BIOS USB legacy emulation is disabled.",
      "Corrupted partition table on the external hard drive."
    ],
    correct: [1],
    explanation: "High-draw USB 3.0 devices experience voltage drop across thin internal front-panel header cables, causing disconnections, whereas rear ports connect directly to the motherboard plane."
  },
  {
    text: "An enterprise machine experiences random Kernel-Power Event 41 errors in the Windows Event Viewer, specifically occurring during idle states or low-power C-states rather than heavy loads. Which BIOS setting adjustment is the most appropriate troubleshooting step?",
    options: [
      "Disabling Intel SpeedStep / AMD Cool'n'Quiet or adjusting C-State limits (e.g., disabling C6/C7).",
      "Increasing the RAM voltage by 0.05V.",
      "Disabling Secure Boot and TPM 2.0.",
      "Changing the SATA controller mode from AHCI to RAID."
    ],
    correct: [0],
    explanation: "Random idle crashes and Event 41 errors often result from transient voltage drops during deep package sleep states (C6/C7); disabling deep C-states stabilizes idle voltages."
  },
  {
    text: "When troubleshooting a system that fails to recognize a newly installed M.2 NVMe SSD, what hardware-level conflict should a technician check first in the motherboard manual?",
    options: [
      "PCIe lane sharing/bandwidth bifurcation where using a specific M.2 slot disables certain SATA ports or secondary PCIe slots.",
      "The color coding of the DIMM slots.",
      "Whether the power supply has an available SATA power connector.",
      "The physical length mismatch between Type 2242 and Type 2280 drives."
    ],
    correct: [0],
    explanation: "Many motherboards share high-speed I/O lanes; populating an M.2 slot often disables specific onboard SATA ports or secondary PCIe slots."
  },
  {
    text: "A technician measures a ripple voltage of over 150mV on the 5V VCC rail of a motherboard using an oscilloscope. What symptom will this most commonly manifest in the computer?",
    options: [
      "Random blue screens (BSOD), memory parity errors, and silent data corruption on storage drives.",
      "Complete failure of the Ethernet port to negotiate gigabit speeds.",
      "Continuous boot-looping exactly 30 seconds after POST.",
      "Permanent locking of the BIOS password protection."
    ],
    correct: [0],
    explanation: "ATX specification limits 5V ripple to 50mV peak-to-peak. Exceeding 150mV injects noise into digital logic, leading to parity errors, BSODs, and storage data corruption."
  },
  {
    text: "What is the primary function of the Power Good (PG / POK) signal sent from the PSU to the motherboard chipset?",
    options: [
      "To signal that all DC output voltages have stabilized within acceptable tolerance limits before allowing the CPU to release its reset signal.",
      "To regulate the fan speed profile based on internal PSU ambient temperature.",
      "To switch the system between ACPI S0 and S3 sleep states.",
      "To protect the primary transformer from lightning surges."
    ],
    correct: [0],
    explanation: "The Power Good (+5V) signal confirms all DC voltage rails are stabilized and within spec before the motherboard releases the processor from its reset state."
  },

  // Section 2: Networking, Troubleshooting, & System Integration
  {
    text: "A user reports intermittent network drops and inability to access internal branch office shares. Upon inspection, the network interface card (NIC) link light is blinking erratically, and arp -a shows multiple gateway IP addresses mapped to different MAC addresses. What security or network anomaly does this indicate?",
    options: [
      "Duplicate IP address assignment or an active ARP poisoning/spoofing attack on the local subnet.",
      "DHCP scope exhaustion causing lease renegotiation failures.",
      "Spanning Tree Protocol (STP) topology reconfiguration storm.",
      "Physical layer attenuation due to an unshielded twisted pair cable crossing a fluorescent ballast."
    ],
    correct: [0],
    explanation: "Multiple MAC addresses mapped to the gateway IP in the ARP table indicates duplicate IP conflicts or a Man-in-the-Middle ARP poisoning/spoofing attack."
  },
  {
    text: "A Level III maintenance specialist is tasked with diagnosing a user's network system where the computer obtains a self-assigned IP address (169.254.x.x) despite the physical cable being verified and the switch port being active. What is the logical sequence of troubleshooting?",
    options: [
      "Check DHCP server availability, verify local NIC driver binding, test TCP/IP stack using netsh int ip reset, and check for rogue 802.1X port-security blocks.",
      "Immediately replace the motherboard network controller chip.",
      "Re-flash the core switch firmware via TFTP.",
      "Change the subnet mask from 255.255.255.0 to 255.255.0.0."
    ],
    correct: [0],
    explanation: "An APIPA address (169.254.x.x) indicates failure to obtain a DHCP lease; troubleshooting must check DHCP reachability, stack integrity, driver bindings, and 802.1X port security."
  },
  {
    text: "When troubleshooting a persistent network issue where packets are fragmenting excessively and causing high latency for VoIP and video conferencing services, which command-line diagnostic tool and parameter should be used to find the Maximum Transmission Unit (MTU) path size without fragmentation?",
    options: [
      "ping -f -l [size] [destination_IP]",
      "tracert -d [destination_IP]",
      "nslookup -type=mx [domain]",
      "netstat -ano | findstr ESTABLISHED"
    ],
    correct: [0],
    explanation: "ping with -f (Don't Fragment) and -l (buffer size) identifies the path MTU threshold where packets fragment."
  },
  {
    text: "A user cannot connect to the institutional network after moving to a new conference room. The port is active, but the switch port uses Network Access Control (NAC) / 802.1X authentication. What service on the client computer must be verified to ensure proper credential negotiation?",
    options: [
      "Wired AutoConfig (dot3svc) service",
      "Remote Procedure Call (RPC) Locator service",
      "Windows Audio Endpoint Builder",
      "Background Intelligent Transfer Service (BITS)"
    ],
    correct: [0],
    explanation: "The Wired AutoConfig (dot3svc) service in Windows handles 802.1X authentication over Ethernet networks."
  },
  {
    text: "When a network problem involves higher-level network or system equipment (such as VLAN tagging failures, core switch routing loops, or firewall ACL blocks), what is the mandatory protocol defined in the Level III job scope?",
    options: [
      "Attempt to reconfigure the core switch via SSH using default administrative credentials.",
      "Refer the problem immediately to the network administrator.",
      "Disconnect the core switch from the patch panel to isolate the segment.",
      "Format the affected user computers and reinstall the network stack."
    ],
    correct: [1],
    explanation: "Core infrastructure, VLAN routing, and firewall ACL issues fall outside the workstation maintenance remit and must be referred directly to the network administrator."
  },
  {
    text: "A workstation experiences frequent packet loss exclusively when communicating with a branch office across a WAN link during peak hours. Running pathping reveals high latency and packet loss starting at the local gateway router. What should the technician verify?",
    options: [
      "QoS (Quality of Service) policies, interface buffer overruns, and circuit bandwidth saturation.",
      "The physical CAT6 cable length between the user's desk and the floor box (checking if it exceeds 100 meters).",
      "Whether the workstation's CMOS battery is depleted.",
      "The local computer's local hard drive fragmentation level."
    ],
    correct: [0],
    explanation: "Packet loss and latency originating at the gateway during peak hours points to WAN circuit saturation, queuing drops, or unoptimized QoS prioritization."
  },
  {
    text: "Which utility should a technician use to capture and inspect raw Ethernet frames to diagnose a rogue DHCP server operating on the local area network?",
    options: [
      "Wireshark or tcpdump",
      "Task Manager Performance tab",
      "ipconfig /renew",
      "Device Manager network adapter properties"
    ],
    correct: [0],
    explanation: "Wireshark or tcpdump captures raw Ethernet broadcast frames (DHCP Offer / Ack packets) to identify rogue server IP and MAC addresses."
  },
  {
    text: "If a computer's subnet mask is set to 255.255.255.240, how many usable host IP addresses are available on that subnet?",
    options: [
      "14 usable hosts (32 total IPs minus network ID and broadcast ID, with 4 bits for hosts: 2^4 - 2 = 14).",
      "30 usable hosts",
      "62 usable hosts",
      "254 usable hosts"
    ],
    correct: [0],
    explanation: "A /28 subnet (255.255.255.240) leaves 4 host bits: 2^4 = 16 total IPs minus network and broadcast addresses = 14 usable hosts."
  },
  {
    text: "A user reports that internal web applications load extremely slowly, while external internet sites load instantly. Upon investigation, DNS resolution for internal domain names is timing out or pointing to an external public DNS server instead of the internal DNS server. How should this be resolved?",
    options: [
      "Verify and correct the primary IPv4 DNS server address on the local adapter settings to point to the internal domain controller/DNS server.",
      "Flush the browser cache and clear cookies.",
      "Reinstall the web browser application.",
      "Upgrade the local workstation's RAM."
    ],
    correct: [0],
    explanation: "Internal enterprise zones require the internal DNS server (domain controller); using external DNS causes internal name resolution to fail or time out."
  },
  {
    text: "What is the primary purpose of configuring VLANs (Virtual Local Area Networks) in an enterprise network environment managed by IT specialists?",
    options: [
      "To logically segment broadcast domains, enhance security, and control traffic flow between different institutional departments.",
      "To physically extend copper cables beyond the 100-meter limitation without repeaters.",
      "To increase the raw clock speed of switches through packet compression.",
      "To automate IP address assignment without requiring a DHCP server."
    ],
    correct: [0],
    explanation: "VLANs segment broadcast domains, isolate departmental network traffic, enforce access controls, and optimize bandwidth utilization."
  },

  // Section 3: File Security, Data Storage, & Backup Integrity
  {
    text: "During complex maintenance on a data storage device containing critical institutional files, the hard drive begins clicking and failing to spin up reliably. According to the Level III job description, what is the absolute priority protocol regarding file security and data storage?",
    options: [
      "Attempt low-level disk formatting to clear sector bad blocks.",
      "Ensure that files remain secure, handle data storage devices with extreme care, and protect backup data storage integrity.",
      "Immediately run chkdsk /f /r on the live production volume.",
      "Disassemble the drive spindle in an open office environment to inspect the platters."
    ],
    correct: [1],
    explanation: "File security and backup data storage integrity are paramount. Mechanical drive failures require cautious handling to prevent permanent platter damage."
  },
  {
    text: "A technician is verifying the integrity of a backup data storage archive before performing a major system upgrade across branch offices. Which cryptographic hashing algorithm is standardly used to verify that the backup image has not been corrupted or tampered with?",
    options: [
      "SHA-256 (or MD5/SHA-1, though SHA-256 is modern standard).",
      "ASCII encoding",
      "Base64 translation",
      "DES encryption"
    ],
    correct: [0],
    explanation: "SHA-256 is the cryptographic standard for generating verifiable bit-level checksums to validate archive integrity and guard against data corruption."
  },
  {
    text: "When repairing or replacing a failed data storage device (HDD/SSD) that contained sensitive institutional records, what procedure must be executed to comply with security standards before disposal or return under warranty?",
    options: [
      "Secure wiping / cryptographic erasure / physical destruction in accordance with data protection policies.",
      "Simply deleting all visible folders from the Recycling Bin.",
      "Renaming the drive volume label to \"Unassigned\".",
      "Placing the drive in the standard office waste bin."
    ],
    correct: [0],
    explanation: "Data protection mandates cryptographic erasure, multi-pass overwriting, or physical degaussing/shredding before disposing of drives holding sensitive data."
  },
  {
    text: "A user accidentally deletes a shared network folder containing vital departmental reports. The technician checks the Volume Shadow Copy Service (VSS) / Previous Versions feature on the server/storage share. What does VSS rely on to restore files to a specific point in time?",
    options: [
      "Periodic block-level snapshots of changes made to the volume.",
      "Real-time cloud synchronization logs.",
      "The Windows Registry backup hives in System32\\config.",
      "The master boot record (MBR) partition table backup."
    ],
    correct: [0],
    explanation: "Volume Shadow Copy Service (VSS) creates point-in-time, block-level differential snapshots of changed sectors across the NTFS/ReFS volume."
  },
  {
    text: "What is the key difference between a full backup, an incremental backup, and a differential backup regarding restore speed and storage space?",
    options: [
      "Incremental backs up files changed since the last backup (fastest backup, slowest restore requiring all chains); differential backs up files changed since the last full backup (faster restore requiring only full + latest differential).",
      "Incremental requires more storage space than a full backup.",
      "Differential backups cannot be restored on network-attached storage.",
      "Full backups only save modified file attributes without actual data payloads."
    ],
    correct: [0],
    explanation: "Incremental saves daily changes since the prior backup (fastest backup, complex restore chain); differential saves all changes since the last full (faster, simpler restore)."
  },
  {
    text: "During routine maintenance, you notice that an enterprise database server's RAID 5 array has suffered a single disk failure and is currently operating in \"Degraded\" mode. What is the immediate action required?",
    options: [
      "Hot-swap the failed drive immediately with a verified compatible drive to initiate automatic reconstruction before a second drive failure causes catastrophic data loss.",
      "Convert the RAID 5 array to RAID 0 for higher performance.",
      "Run a full defragmentation on the degraded array.",
      "Ignore the warning since RAID 5 can withstand two simultaneous drive failures."
    ],
    correct: [0],
    explanation: "RAID 5 has single-drive fault tolerance; a degraded array must be rebuilt immediately with a fresh drive before an unrecoverable read error or second drive failure destroys data."
  },
  {
    text: "A technician encounters an external USB drive formatted in FAT32 that refuses to accept a newly prepared system disk image file sized at 5.2 GB. What is the technical reason?",
    options: [
      "FAT32 has a maximum individual file size limit of 4 GB.",
      "USB ports do not support files larger than 2 GB.",
      "The drive must be formatted to NTFS or exFAT to support files over 4 GB.",
      "Both A and C."
    ],
    correct: [3],
    explanation: "FAT32 has an architectural 4 GB single-file size ceiling. Storing files larger than 4 GB requires formatting the volume as NTFS or exFAT."
  },
  {
    text: "What specialized file permission issue occurs when moving files within the same NTFS volume versus copying files to a different NTFS volume?",
    options: [
      "Moving retains original permissions; copying inherits the permissions of the destination folder.",
      "Moving strips all permissions, making files completely inaccessible.",
      "Copying retains original permissions; moving strips permissions.",
      "There is no difference in permission handling between moving and copying in NTFS."
    ],
    correct: [0],
    explanation: "In NTFS, moving files within the same volume retains explicit permissions, while copying files (or moving across different volumes) inherits destination parent folder permissions."
  },
  {
    text: "When implementing backup verification protocols, why is a \"bit-level verification\" or checksum comparison superior to a simple file-count comparison?",
    options: [
      "It verifies that every individual data bit matches the source, catching silent data corruption (bit rot) or incomplete write operations that file counts miss.",
      "It compresses the backup size by 50%.",
      "It automatically deletes duplicate files across the network.",
      "It encrypts the backup file using AES-128."
    ],
    correct: [0],
    explanation: "File counts only confirm that a container exists, missing bit rot, bad blocks, or truncated contents. Cryptographic checksums ensure exact bit-for-bit fidelity."
  },
  {
    text: "In the context of data storage reliability, what does SMART (Self-Monitoring, Analysis, and Reporting Technology) monitor on modern HDDs and SSDs?",
    options: [
      "Internal drive telemetry metrics such as reallocated sector count, uncorrectable sector count, power-on hours, and wear-leveling counts to predict imminent failure.",
      "The external ambient temperature of the computer chassis.",
      "The read/write speed in megabytes per second during active file transfers.",
      "The network bandwidth consumed during cloud backups."
    ],
    correct: [0],
    explanation: "SMART tracks internal physical health indicators (reallocated sectors, uncorrectable errors, write amplification, wear leveling) to provide early failure warnings."
  },

  // Section 4: Procurement, Technical Evaluation, & Tender Documentation
  {
    text: "According to the Level III job description, one of the major duties is conducting technical evaluations of tender documents submitted for the procurement of laptops, desktop computers, and related equipment. When evaluating competing vendor bids, what is the primary purpose of checking compliance with technical specifications?",
    options: [
      "Ensuring the offered equipment meets or exceeds the minimum performance, durability, and compatibility standards required by the institution without accepting substandard substitutes.",
      "Selecting the absolute cheapest brand regardless of warranty or processor generation.",
      "Verifying which vendor offers the most attractive marketing gifts to the evaluation committee.",
      "Ensuring all computers have identical casing colors."
    ],
    correct: [0],
    explanation: "Technical evaluation ensures bids strictly comply with mandatory performance, architecture, and reliability specifications to prevent procurement of substandard hardware."
  },
  {
    text: "A tender document specifies procurement of enterprise-grade laptops with \"Intel Core Ultra 7 155H processors, 16GB LPDDR5x RAM, and NVMe PCIe 4.0 SSDs\". A vendor submits a bid offering consumer-grade laptops with older \"Intel Core i7-1255U processors, DDR4 RAM, and SATA III SSDs\" at a lower price, claiming they are equivalent. How must the Level III technical evaluator score this bid?",
    options: [
      "Non-compliant (Technically rejected) because the components fail to meet the mandatory specification baseline.",
      "Fully compliant because both processors are labeled \"Core i7/Ultra 7\".",
      "Conditionally accepted if the vendor upgrades the RAM.",
      "Accepted based on lowest price principle in public procurement."
    ],
    correct: [0],
    explanation: "Older architecture, DDR4, and SATA III SSDs fail mandatory specification thresholds; non-compliant bids must be technically disqualified."
  },
  {
    text: "When preparing or evaluating technical specifications for desktop computers destined for a dusty manufacturing plant or branch office environment, which chassis form factor and environmental rating should be prioritized?",
    options: [
      "Small Form Factor (SFF) or Tower with washable dust filters and robust thermal management, avoiding liquid-cooling systems.",
      "Ultra-slim fanless mini-PCs with glass side panels.",
      "Open-frame gaming rigs with RGB lighting.",
      "Waterproof marine-grade laptops."
    ],
    correct: [0],
    explanation: "Industrial and dusty environments require robust air filtration, positive pressure chassis design, and dependable air-cooled thermal dissipation."
  },
  {
    text: "In public and institutional procurement evaluations, why is it critical to verify the vendor's authorized partnership status and manufacturer warranty terms (e.g., 3-year Next Business Day Onsite Support)?",
    options: [
      "To guarantee genuine hardware supply, access to authorized spare parts, and reliable manufacturer-backed post-warranty support rather than grey-market imports.",
      "To ensure the vendor pays lower shipping taxes.",
      "To make the evaluation report paperwork thicker.",
      "Manufacturer warranties are legally irrelevant once equipment is delivered."
    ],
    correct: [0],
    explanation: "Authorized partner status ensures genuine parts, official warranty entitlement, and long-term service level agreements rather than gray-market equipment."
  },
  {
    text: "What is the primary risk of omitting clear definitions for \"equivalent or better\" clauses in IT equipment procurement technical specifications?",
    options: [
      "Vendors may supply obsolete or mismatched hardware components that lead to driver incompatibility, reduced lifespan, and maintenance nightmares.",
      "The delivery process will take exactly one extra week.",
      "The finance department will refuse to disburse funds.",
      "The computers will consume less electrical power."
    ],
    correct: [0],
    explanation: "Vague equivalence clauses allow vendors to bid outdated or substandard alternatives, creating fleet fragmentation and maintenance bottlenecks."
  },
  {
    text: "When reviewing warranty terms in a tender document for enterprise servers, what does \"NBD (Next Business Day) Onsite Support\" specifically obligate the supplier to do?",
    options: [
      "Send a certified technician with replacement parts to the institution's location by the end of the next business day following problem diagnosis.",
      "Ship the faulty server back to the factory via standard postal mail within 30 days.",
      "Provide telephone troubleshooting advice between 8 AM and 5 PM.",
      "Replace the entire server model with a newer generation every year."
    ],
    correct: [0],
    explanation: "NBD Onsite guarantees that an authorized field technician with requisite parts will arrive on-site the following business day to execute hardware repairs."
  },
  {
    text: "A tender evaluation committee receives bids where one vendor's proposal lacks required ISO certification documents specified in the bidding sheet. What is the correct protocol for the Level III technical specialist?",
    options: [
      "Disqualify the bid during the preliminary technical responsiveness check.",
      "Call the vendor and ask them to forge the certificate before afternoon.",
      "Accept the bid because ISO certificates do not affect computer performance.",
      "Reduce the vendor's financial score by 5%."
    ],
    correct: [0],
    explanation: "Mandatory qualification criteria (such as ISO quality certifications) must be satisfied during preliminary responsiveness; failure leads to disqualification."
  },
  {
    text: "Why must IT maintenance specialists collaborate closely with procurement departments when drafting specifications for computer spare parts (such as batteries, keyboards, and power adapters)?",
    options: [
      "To ensure 100% OEM (Original Equipment Manufacturer) or rigorously tested high-quality compatibility, preventing premature hardware failure and safety hazards (e.g., exploding lithium-ion batteries).",
      "To ensure spare parts are painted in corporate colors.",
      "To reduce the total number of items stored in the warehouse to zero.",
      "Procurement does not need technical input for spare parts."
    ],
    correct: [0],
    explanation: "Technical input ensures genuine OEM or certified parts with proper electrical tolerances, avoiding fire hazards and component damage from counterfeit parts."
  },
  {
    text: "When evaluating a tender for uninterruptible power supply (UPS) units to protect server infrastructure, what key electrical rating must be evaluated beyond simple Volt-Amperes (VA)?",
    options: [
      "Wattage capacity (real power output) and Pure Sine Wave output versus simulated sine wave, ensuring compatibility with active-PFC power supplies.",
      "The physical weight of the plastic enclosure.",
      "The color of the LED status indicator panel.",
      "The length of the included USB communication cable."
    ],
    correct: [0],
    explanation: "Modern enterprise server PSUs with Active PFC require pure sine wave output to prevent shutdown or damage during utility power loss."
  },
  {
    text: "What is the purpose of maintaining an up-to-date ICT asset inventory register (hardware and software) at headquarters and branch offices as part of the maintenance specialist's responsibilities?",
    options: [
      "To track equipment lifecycle, warranty status, software license compliance, deployment locations, and facilitate accurate budgeting and procurement planning.",
      "To calculate employee salaries based on keyboard usage.",
      "To prevent computers from connecting to unauthorized Wi-Fi networks.",
      "To automatically generate desktop wallpaper for all users."
    ],
    correct: [0],
    explanation: "Asset registries track equipment depreciation, warranty coverage, licensing compliance, and lifecycle refresh schedules across institutional branches."
  },

  // Section 5: Software Maintenance, OS Troubleshooting, & Upgrades
  {
    text: "A user's Windows workstation fails to boot after a routine cumulative update, displaying a INACCESSIBLE_BOOT_DEVICE (BSOD 0x0000007B). What is the most probable cause and immediate remediation step?",
    options: [
      "The update reset the SATA controller mode in BIOS from AHCI/RAID to IDE; enter BIOS and restore the correct storage controller mode.",
      "The RAM sticks are physically loose; reseat the DIMMs.",
      "The monitor cable is plugged into the motherboard instead of the GPU.",
      "The CMOS battery voltage is too high."
    ],
    correct: [0],
    explanation: "Stop 0x7B / INACCESSIBLE_BOOT_DEVICE indicates storage driver/controller mode mismatch, often caused when BIOS resets from AHCI/RAID to legacy IDE."
  },
  {
    text: "When monitoring existing software across institutional workstations, a Level III technician discovers that several machines are infected with file-infecting polymorphic malware that resists standard antivirus removal. What advanced tool and procedure should be deployed?",
    options: [
      "Bootable offline rescue media (e.g., Windows PE or dedicated antivirus rescue disks) to scan and disinfect files before the operating system kernel loads.",
      "Running gpupdate /force while connected to guest Wi-Fi.",
      "Reinstalling Adobe Acrobat Reader on all affected machines.",
      "Changing the computer name in System Properties."
    ],
    correct: [0],
    explanation: "Polymorphic rootkits and file infectors hook OS system calls; scanning with offline bootable rescue media scans the disk before malware drivers execute."
  },
  {
    text: "A technician is tasked with performing a mass operating system upgrade across 150 institutional PCs. To ensure consistency and efficiency without manually installing drivers and software one by one, what method is specified in advanced maintenance duties?",
    options: [
      "Preparing standardized disk images / golden images deployed via network imaging (e.g., WDS/PXE boot or SCCM/MDT).",
      "Mailing USB thumb drives to every individual employee.",
      "Downloading the OS installer through web browsers on each machine simultaneously.",
      "Upgrading the hardware components of each machine individually."
    ],
    correct: [0],
    explanation: "Standardized golden images deployed over PXE boot/MDT/SCCM ensure uniform drivers, security baselines, and application environments at scale."
  },
  {
    text: "During software maintenance, a user's machine reports that the Master File Table (MFT) is corrupted on NTFS drive C:. Which built-in command-line utility should be executed from the Windows Recovery Environment (WinRE) to attempt repair?",
    options: [
      "chkdsk C: /f /r",
      "sfc /scannow",
      "dism /online /cleanup-image /restorehealth",
      "bootrec /fixmbr"
    ],
    correct: [0],
    explanation: "chkdsk /f /r checks and repairs file system metadata, repairs the Master File Table (MFT), and recovers readable data from bad sectors."
  },
  {
    text: "What is the function of the Deployment Image Servicing and Management (DISM) tool when used with the /online /cleanup-image /restorehealth parameter?",
    options: [
      "To repair a corrupted Windows component store (WinSxS folder) using Windows Update or a healthy source image as a repository.",
      "To defragment mechanical hard drive platters.",
      "To wipe the disk partition table securely.",
      "To reset all local user account passwords to default."
    ],
    correct: [0],
    explanation: "DISM /restorehealth inspects and repairs corruption within the Windows Component Store (WinSxS) using official servicing sources."
  },
  {
    text: "A critical business application crashes immediately upon launch on workstations running a newly released Windows OS build due to a legacy DLL conflict. What is the interim troubleshooting technique a technician can apply without waiting for a vendor patch?",
    options: [
      "Running the application in Compatibility Mode and adjusting user account control (UAC) or DEP (Data Execution Prevention) settings.",
      "Overclocking the CPU frequency.",
      "Disconnecting the Ethernet cable during application startup.",
      "Reinstalling the network interface card driver."
    ],
    correct: [0],
    explanation: "Windows Compatibility Mode shims emulate legacy OS versions and DLL behavior to maintain application execution until official patches are released."
  },
  {
    text: "When monitoring software licenses across branch offices, a technician finds that commercial software is installed on 45 machines, but only 30 licenses were procured. What administrative action is required?",
    options: [
      "Immediately report the compliance gap to management, uninstall excess instances or procure additional licenses to avoid legal and audit penalties.",
      "Change the software serial number registry keys to bypass activation checks.",
      "Disconnect the 15 unlicensed computers from the power grid.",
      "Ignore the discrepancy since software developers never audit institutions."
    ],
    correct: [0],
    explanation: "Unlicensed software exposes the institution to severe legal and financial penalties; compliance gaps must be reported and rectified immediately."
  },
  {
    text: "A user's Outlook email client freezes whenever searching for messages older than six months. The local OST file size is 48 GB. What is the best practice solution?",
    options: [
      "Enable Cached Exchange Mode slider to a shorter timeframe (e.g., 12 months) and archive older items to a PST file.",
      "Delete the Windows Registry entirely.",
      "Upgrade the monitor resolution from 1080p to 4K.",
      "Reinstall the network printer drivers."
    ],
    correct: [0],
    explanation: "Outlook OST files approaching the 50 GB threshold experience index fragmentation; reducing sync duration and archiving prevents corruption and freezes."
  },
  {
    text: "What does the Windows sfc /scannow (System File Checker) command specifically inspect and repair?",
    options: [
      "Protected operating system system files, replacing corrupted or modified DLLs and binaries with cached healthy versions from the component store.",
      "User personal documents stored in the My Documents folder.",
      "Third-party application databases like SQL Server or MySQL.",
      "Bad sectors on the physical surface of mechanical hard drives."
    ],
    correct: [0],
    explanation: "SFC checks cryptographic signatures of core system files (DLLs, EXEs) and replaces corrupted files from the cached WinSxS directory."
  },
  {
    text: "When studying new upgrade methods as mandated by the Level III role, a technician evaluates in-place upgrades versus clean installations of operating systems. What is the primary advantage of a clean installation?",
    options: [
      "It eliminates accumulated registry bloat, legacy driver conflicts, and latent malware, ensuring maximum system performance and stability.",
      "It preserves all installed third-party games and custom user settings automatically.",
      "It takes significantly less time than an in-place upgrade.",
      "It does not require backing up user files."
    ],
    correct: [0],
    explanation: "A clean install wipes stale registry hives, leftover legacy drivers, and latent spyware, guaranteeing a clean, stable baseline."
  },

  // Section 6: Preventive Maintenance, Documentation, & User Training
  {
    text: "According to the Level III job description, why must maintenance specialists record and properly maintain technical documentation of solutions taken for problems encountered?",
    options: [
      "To build an institutional knowledge base, prevent repeated troubleshooting efforts, ensure service continuity, and improve team efficiency.",
      "To fulfill paperwork quotas without practical utility.",
      "To provide comic relief for incoming junior technicians.",
      "To justify increasing employee working hours on weekends."
    ],
    correct: [0],
    explanation: "Documenting technical solutions creates an institutional knowledge base, streamlines recurring issue resolution, and ensures organizational continuity."
  },
  {
    text: "When preparing user-friendly manuals and operating guides that enable users to perform basic maintenance and proper equipment handling, what tone and structural approach should the Level III specialist adopt?",
    options: [
      "Clear, non-technical step-by-step instructions with visual illustrations, avoiding overly complex jargon while emphasizing preventative care.",
      "Pure assembly-language code snippets and circuit schematic diagrams.",
      "Strict legal threats of financial penalties for hardware damage.",
      "Academic research paper formatting with bibliography references."
    ],
    correct: [0],
    explanation: "End-user manuals must be accessible, visual, and concise to encourage user compliance and prevent equipment damage from mishandling."
  },
  {
    text: "During periodic preventive maintenance of office computers and printers, cleaning dust accumulation from heat sinks and cooling fans is critical. What safety precaution must be taken before blowing compressed air into fan assemblies?",
    options: [
      "Hold the fan blades physically stationary with a non-conductive tool to prevent them from spinning freely, which can generate reverse electrical current (back-EMF) and destroy motherboard fan headers.",
      "Spray the compressed air canister while holding it completely upside down for maximum cooling.",
      "Leave the computer plugged into the live AC wall socket to keep the ground active.",
      "Wear rubber gloves while licking the heatpipe assembly."
    ],
    correct: [0],
    explanation: "High-velocity air spins fan motors beyond rated RPM, generating back-EMF voltage spikes that can fry motherboard fan controller circuitry."
  },
  {
    text: "When designing questionnaires for research into problems arising from computer use and user satisfaction, what is the primary objective?",
    options: [
      "To identify recurring technical bottlenecks, training deficiencies, and hardware failure trends to improve IT service delivery and policy.",
      "To rate employee typing speed and personal internet habits.",
      "To collect employee home addresses for direct marketing.",
      "To determine which brand of coffee office workers prefer."
    ],
    correct: [0],
    explanation: "Empirical surveys pinpoint recurring hardware failure points, user training deficits, and IT service friction to guide process improvement."
  },
  {
    text: "A technician is conducting training for departmental staff on basic computer handling and security best practices. Which topic is vital to cover regarding password management and phishing defense?",
    options: [
      "Recognizing suspicious email links/attachments, avoiding reuse of passwords across multiple platforms, and utilizing multi-factor authentication (MFA).",
      "Writing passwords on sticky notes attached to monitor bezels for easy recall.",
      "Sharing user credentials with colleagues during vacation leave.",
      "Disabling screen locks to save electricity."
    ],
    correct: [0],
    explanation: "Security awareness training must focus on phishing indicators, credential hygiene, avoiding password reuse, and using MFA."
  },
  {
    text: "What is the purpose of verifying the quality of maintenance work performed by other junior professionals or technicians (Level I/II) as outlined in the Level III duties?",
    options: [
      "Quality assurance, ensuring adherence to institutional standards, preventing recurring faults, and mentoring junior staff.",
      "Finding excuses to dock junior staff salaries.",
      "Proving personal superiority within the IT department.",
      "Ensuring all computers are painted the same color."
    ],
    correct: [0],
    explanation: "Level III specialists provide quality assurance, verify diagnostic rigor, and mentor junior technicians to maintain high service standards."
  },
  {
    text: "When implementing new IT-use policies proposed to modernize maintenance and user operations, what is the crucial preliminary step before institutional rollout?",
    options: [
      "Thorough testing, pilot deployment, and obtaining formal administrative approval.",
      "Enforcing the policy immediately at midnight without notifying branch offices.",
      "Translating the policy into three foreign languages.",
      "Printing 10,000 paper copies for recycling bins."
    ],
    correct: [0],
    explanation: "Institutional policy rollouts require rigorous pilot testing, administrative sign-off, and proactive user communication to ensure seamless adoption."
  },
  {
    text: "What professional conduct should a maintenance specialist exhibit when receiving a frustrated user submitting an urgent maintenance request for a failed workstation prior to a major presentation?",
    options: [
      "Professional empathy, active listening, calm diagnostic methodology, and providing a clear timeline or temporary workaround.",
      "Telling the user that their lack of technical skill caused the hardware failure.",
      "Ignoring the ticket until the presentation deadline has passed.",
      "Refusing service because the computer was purchased last year."
    ],
    correct: [0],
    explanation: "High-stress IT incidents demand de-escalation, professional empathy, clear communication, and fast provision of interim workarounds."
  },
  {
    text: "Why is thermal paste replacement an essential component of periodic preventive maintenance for high-performance enterprise desktop workstations?",
    options: [
      "Over time, thermal paste dries out, cracks, and loses its thermal conductivity, leading to high CPU temperatures, thermal throttling, and system instability.",
      "To change the color of the processor die.",
      "To increase the electrical conductivity between the CPU pins and socket.",
      "To prevent optical disc drives from scratching CDs."
    ],
    correct: [0],
    explanation: "Thermal paste dehydrates over years of heat cycling, creating microscopic air gaps that impede heat transfer and trigger CPU thermal throttling."
  },
  {
    text: "When collecting best practices that can improve the effectiveness of ICT maintenance work, where should a Level III specialist look for empirical data?",
    options: [
      "Maintenance logs, ticket resolution histories, user feedback questionnaires, and industry-standard frameworks (e.g., ITIL).",
      "Social media entertainment videos.",
      "Historical fiction novels.",
      "Personal intuition without checking historical data."
    ],
    correct: [0],
    explanation: "Data-driven improvements rely on helpdesk metrics, resolution timelines, recurring failure trends, and proven ITIL service management frameworks."
  },

  // Section 7: Peripherals, Display Systems, & Video Conferencing
  {
    text: "A Level III technician is setting up a professional video-conferencing system and large-format LCD display in the main boardroom for senior officials. During testing, the HDMI audio is working, but no video is displayed on the screen. What is the first troubleshooting step?",
    options: [
      "Verify input source selection on the display, test cable integrity, check EDID handshake issues, and verify GPU display output settings (e.g., Extend/Duplicate mode).",
      "Reinstall the computer's audio sound card drivers.",
      "Replace the conference room power transformer.",
      "Format the hard drive of the presentation laptop."
    ],
    correct: [0],
    explanation: "Audio without video over HDMI usually indicates display input selection error, resolution mismatch, HDCP/EDID negotiation failure, or secondary display disablement."
  },
  {
    text: "During a live video conference involving high-ranking officials, the audio feed experiences severe echoing and acoustic feedback. What is the most effective technical adjustment?",
    options: [
      "Adjust microphone gain levels, enable acoustic echo cancellation (AEC) in conferencing software, and physically separate microphones from speakers.",
      "Increase the speaker volume to maximum to drown out the echo.",
      "Unplug the Ethernet cable and switch to Bluetooth 2.0 audio.",
      "Switch the display resolution from 4K to 720p."
    ],
    correct: [0],
    explanation: "Feedback and echoes occur when microphones pick up speaker output; enabling Acoustic Echo Cancellation (AEC) and lowering mic gain eliminates acoustic loops."
  },
  {
    text: "A network printer shared across multiple branch departments suddenly stops printing, and jobs remain stuck in the print queue with an \"Error - Printing\" status. The print spooler service on the print server keeps crashing. How should a Level III technician resolve this?",
    options: [
      "Stop the Print Spooler service, clear corrupted cache files in C:\\Windows\\System32\\spool\\PRINTERS, restart the service, and reinstall/update the printer driver.",
      "Replace the physical paper rollers inside the printer.",
      "Reinstall the operating system of every workstation connected to the printer.",
      "Upgrade the printer's RAM from 256MB to 16GB."
    ],
    correct: [0],
    explanation: "Corrupted print jobs lock the spooler buffer; stopping the spooler service, purging C:\\Windows\\System32\\spool\\PRINTERS, and restarting the service clears the jam."
  },
  {
    text: "What is the primary cause of vertical colored streaks appearing on printouts from a laser printer?",
    options: [
      "A scratched, worn, or dirty organic photoconductor (OPC) drum or toner leakage wiping blade failure.",
      "Low network bandwidth between the PC and the printer.",
      "Corrupted printer font cartridges.",
      "Outdated printer firmware."
    ],
    correct: [0],
    explanation: "Continuous vertical lines or streaks in laser printing indicate a scratched OPC drum surface or damaged cleaning wiper blade."
  },
  {
    text: "When configuring a network-attached commercial multifunction printer (MFP), why is it a security best practice to disable unnecessary protocols such as Telnet, FTP, and SNMPv1/v2c?",
    options: [
      "To prevent unauthorized remote access, credential sniffing, and exploitation of unencrypted administrative protocols by malicious actors.",
      "To speed up the physical printing of monochrome documents.",
      "To reduce the amount of toner consumed per page.",
      "To prevent paper jams in the duplex unit."
    ],
    correct: [0],
    explanation: "Legacy plaintext management protocols (Telnet, SNMPv1/2, FTP) transmit credentials unencrypted and are frequent attack vectors into corporate networks."
  },
  {
    text: "A user reports that their USB-C docking station is not charging their laptop or outputting video to dual monitors, although USB thumb drives plugged into the dock work. What is the root cause?",
    options: [
      "The USB-C cable or dock does not support Power Delivery (PD) or DisplayPort Alternate Mode (Alt Mode), or the laptop's USB-C port lacks full feature support.",
      "The laptop hard drive is fragmented.",
      "The printer spooler service is stopped.",
      "The CMOS battery is unseated."
    ],
    correct: [0],
    explanation: "Data transfers only require basic USB signaling; charging and external video require USB Power Delivery (USB-PD) and DisplayPort Alternate Mode support on both port and dock."
  },
  {
    text: "What is the difference between active and passive HDMI/DisplayPort cables when connecting high-resolution displays over long distances (e.g., 15 meters)?",
    options: [
      "Active cables contain integrated signal booster microchips powered by the source or external USB to regenerate weakened signals; passive cables rely solely on copper wire and suffer signal degradation over long runs.",
      "Active cables only transmit audio, while passive cables transmit video.",
      "Active cables are made of plastic fibers that conduct electricity.",
      "There is no functional difference in maximum transmission distance."
    ],
    correct: [0],
    explanation: "Passive copper cables suffer severe high-frequency attenuation past 5-10m; active cables integrate equalization chips to amplify and regenerate high-bandwidth signals."
  },
  {
    text: "When setting up a multi-display projection system for a large meeting room, the projector image displays severe keystone distortion (trapezoid shape). How is this corrected properly?",
    options: [
      "Adjusting physical projector placement/tilt or utilizing the projector's digital keystone correction and lens shift settings.",
      "Resizing the Windows desktop wallpaper resolution.",
      "Replacing the projector lamp bulb.",
      "Reinstalling the graphics card driver."
    ],
    correct: [0],
    explanation: "Keystone distortion occurs when the projector lens is not perpendicular to the screen plane; lens shift and keystone calibration square the projected image."
  },
  {
    text: "A barcode scanner connected via USB to a workstation in the inventory department inputs erratic characters or gibberish instead of the scanned numbers. What is the likely cause?",
    options: [
      "Keyboard layout / language mismatch between the scanner configuration and the operating system regional settings.",
      "A blown capacitor in the workstation power supply.",
      "Low toner in the network printer.",
      "Corrupted partition table on the workstation SSD."
    ],
    correct: [0],
    explanation: "USB barcode scanners operate as Human Interface Device (HID) keyboards; if scanner encoding and OS keyboard layout/locale differ, character mapping becomes garbled."
  },
  {
    text: "When troubleshooting an interactive flat-panel touch display where touch inputs are offset by several inches from the cursor location, what calibration procedure is required?",
    options: [
      "Running the touchscreen digitizer calibration utility in the operating system or display firmware settings.",
      "Replacing the HDMI cable with a VGA cable.",
      "Upgrading the computer's power supply.",
      "Cleaning the glass surface with water."
    ],
    correct: [0],
    explanation: "Touchscreen coordinate offsets require recalibrating the digitizer matrix points via Windows Tablet PC Settings or display vendor utility."
  },

  // Section 8: Advanced Scenarios, Ethics, & Maintenance Management
  {
    text: "A Level III maintenance specialist observes that a junior technician is systematically bypassing formal change-control procedures and administrative approval when applying urgent firmware patches to core network switches. According to professional maintenance protocols, what is the appropriate action?",
    options: [
      "Educate the junior technician on the risks of unapproved changes, mandate adherence to formal change-management protocols, and report the protocol breach to the supervisor.",
      "Join the junior technician in applying unapproved patches to save time.",
      "Confiscate the junior technician's tools permanently.",
      "Ignore the practice since the patches were successful."
    ],
    correct: [0],
    explanation: "Uncontrolled firmware upgrades jeopardize institutional uptime. Maintenance governance mandates change control compliance and reporting protocol breaches."
  },
  {
    text: "An institution plans to upgrade its entire fleet of desktop computers. The Level III specialist is asked to conduct an initial feasibility study. Which factor should carry the highest weight in determining whether to upgrade existing machines or procure new ones?",
    options: [
      "Cost-benefit analysis comparing upgrade expenses (RAM, SSD, CPU limitations) versus total lifecycle replacement cost, productivity gains, and warranty security.",
      "Choosing whichever computer brand has the most colorful marketing brochure.",
      "Disposing of all computers older than 6 months regardless of performance.",
      "Selecting equipment based on the personal aesthetic preference of the maintenance team leader."
    ],
    correct: [0],
    explanation: "Total Cost of Ownership (TCO) analysis evaluates whether component upgrades provide sufficient multi-year return compared to new warranty-backed fleet replacement."
  },
  {
    text: "During an internal IT audit, discrepancies are found between the serial numbers of deployed laptops and the asset management database. As a Level III specialist responsible for equipment records, what is your immediate responsibility?",
    options: [
      "Conduct a physical audit across all head and branch offices, reconcile discrepancies, update asset records, and document the root cause.",
      "Alter the database serial numbers randomly to match the audit deadline.",
      "Blame the finance department for losing the delivery receipts.",
      "Delete the asset management database entirely."
    ],
    correct: [0],
    explanation: "Asset integrity requires a physical audit, serial number verification, root cause analysis, and record reconciliation."
  },
  {
    text: "A user reports that their computer emits a strong burning electrical odor and smoke appears from the exhaust vent. What is the immediate safety protocol the user and technician must execute?",
    options: [
      "Immediately cut power (unplug the AC power cord / switch off the power strip), evacuate or secure the area from electrical fire hazards, and inspect components safely after complete discharge.",
      "Open a Word document and type a helpdesk ticket while the PC is smoking.",
      "Pour water onto the computer case to cool down the electronics.",
      "Continue working until the computer shuts down automatically."
    ],
    correct: [0],
    explanation: "Immediate power disconnection prevents electrical fire propagation; pouring water onto live electronics creates deadly electrocution risks."
  },
  {
    text: "When implementing a newly developed system to modernize the maintenance service process (such as a digital ticketing and workflow automation system), what user adoption challenge must the specialist anticipate and mitigate?",
    options: [
      "Resistance to change among staff accustomed to informal/paper requests, requiring comprehensive training, clear user manuals, and administrative encouragement.",
      "Computers refusing to connect to the internet due to electric blue screen settings.",
      "Printers consuming twice as much paper.",
      "Automatic hardware self-destruction if tickets are left unresolved."
    ],
    correct: [0],
    explanation: "Transitioning from informal routines to formal digital ticketing requires user empathy, hands-on training, and clear guidance to overcome operational resistance."
  },
  {
    text: "What is the technical difference between ECC (Error-Correcting Code) RAM and non-ECC RAM, and why is ECC mandatory for enterprise servers and critical workstations?",
    options: [
      "ECC RAM features an extra data bit per byte that detects and corrects single-bit memory errors on-the-fly, preventing silent data corruption and system crashes; non-ECC lacks this capability.",
      "ECC RAM operates at half the clock speed of non-ECC RAM to save electricity.",
      "ECC RAM can only be installed in Apple Macintosh computers.",
      "Non-ECC RAM has built-in battery backups."
    ],
    correct: [0],
    explanation: "ECC memory calculates parity bits to detect and rectify transient single-bit flips caused by cosmic rays or electrical noise, preventing data corruption and kernel crashes."
  },
  {
    text: "A technician notices that an enterprise firewall log is flooded with brute-force authentication attempts from external IP addresses targeting the remote desktop (RDP) port (3389). What immediate hardening measure must be implemented?",
    options: [
      "Disable direct external RDP exposure, enforce VPN access for remote connections, change the default RDP port, and implement account lockout policies / firewall geo-blocking.",
      "Format the firewall hard drive and reinstall the operating system.",
      "Increase the monitor brightness on the firewall management console.",
      "Unplug the firewall power supply for 10 seconds."
    ],
    correct: [0],
    explanation: "Direct internet-facing RDP is a severe security vulnerability. Remote access must be funneled through encrypted VPN tunnels and protected by MFA and account lockout rules."
  },
  {
    text: "When performing maintenance on a laptop with an integrated lithium-ion battery that shows visible swelling (bloating), what critical safety procedure must be followed?",
    options: [
      "Handle with extreme care to avoid puncturing the pouch cells (which can cause thermal runaway, toxic gas release, or fire), store in a fireproof container, and dispose of according to hazardous e-waste regulations.",
      "Pierce the swollen pouch with a needle to release trapped air pressure.",
      "Hit the battery gently with a rubber mallet to flatten it back into shape.",
      "Throw it in the standard municipal garbage bin."
    ],
    correct: [0],
    explanation: "Swollen lithium pouches contain flammable electrolyte gases under pressure; puncturing them triggers violent thermal runaway and toxic fires."
  },
  {
    text: "A user's workstation is running exceptionally slowly. Task Manager shows 100% disk utilization by System or Antivirus processes, while CPU and RAM usage are low. Upon checking with SMART tools, the mechanical hard drive shows a high \"Pending Sector Count\". What does this signify?",
    options: [
      "Unstable sectors waiting to be remapped to spare sectors upon a successful write operation; the drive is failing and must be backed up and replaced immediately.",
      "The operating system needs a visual theme update.",
      "The network cable is plugged into the wrong switch port.",
      "The CPU thermal paste has dried out."
    ],
    correct: [0],
    explanation: "Current Pending Sectors represent degraded sectors awaiting reallocation. When disk reads repeatedly fail and retry, disk queue length spikes to 100%."
  },
  {
    text: "According to institutional IT service frameworks, what constitutes a \"Major Incident\" requiring escalation beyond standard Level III maintenance personnel to senior IT management or specialized incident response teams?",
    options: [
      "Wide-scale security breaches, ransomware infections affecting core servers, total branch network blackouts, or critical data loss impacting institutional operations.",
      "A single user forgetting their password on a Monday morning.",
      "A paper jam in a departmental inkjet printer.",
      "A user requesting a larger mouse pad."
    ],
    correct: [0],
    explanation: "Major incidents involve severe operational disruption, enterprise-wide outages, ransomware infection, or substantial data loss threatening institutional continuity."
  },

  // Section 9: Advanced Troubleshooting & Edge Cases
  {
    text: "A technician replaces the CPU in an enterprise motherboard with a newer generation model supported by the board. The system powers on, fans spin, but there is no POST and the CPU debug LED remains lit. What is the most likely root cause?",
    options: [
      "The motherboard BIOS version is outdated and does not contain the microcode required for the new CPU generation; a BIOS update using an older supported CPU or flashback feature is required.",
      "The thermal paste was applied in a zigzag pattern instead of a pea size.",
      "The keyboard is not plugged into a USB 3.0 port.",
      "The monitor resolution is set too high for the BIOS splash screen."
    ],
    correct: [0],
    explanation: "Cross-generational CPU socket support requires updated motherboard BIOS microcode; without it, the motherboard cannot initialize the CPU."
  },
  {
    text: "When analyzing network traffic using packet capture tools, you notice a high volume of broadcast traffic with a destination IP of 255.255.255.255 and UDP port 137/138 originating from a single infected workstation. What protocol is generating this noise?",
    options: [
      "NetBIOS Name Service (NBNS) / WINS broadcast traffic, often indicative of network worm propagation or scanning behavior.",
      "HTTPS secure web browsing traffic.",
      "Standard DHCP lease renewal requests.",
      "NTP time synchronization packets."
    ],
    correct: [0],
    explanation: "UDP ports 137 and 138 carry legacy NetBIOS Name Service and Datagram broadcasts, commonly abused by lateral-movement network worms."
  },
  {
    text: "A user reports that their laptop battery percentage drops precipitously from 65% to 5% instantly, causing abrupt shutdowns without warning. What calibration or hardware issue is present?",
    options: [
      "Battery fuel gauge IC calibration drift or degraded lithium cell capacity failing under load.",
      "Corrupted keyboard controller firmware.",
      "Outdated graphics card display drivers.",
      "Incorrect system timezone settings."
    ],
    correct: [0],
    explanation: "Premature shutdown and sudden percentage dropouts indicate dead battery cell banks or fuel-gauge IC calibration drift failing to measure cell impedance under load."
  },
  {
    text: "During a routine server room inspection, a Level III specialist notices that ambient room temperature has risen to 32°C due to primary air conditioning failure, and server fans are screaming at maximum RPM. What immediate protective measure must be taken?",
    options: [
      "Activate backup cooling units, initiate graceful shutdown of non-essential servers to reduce thermal load, and alert facilities management immediately.",
      "Open all server chassis side panels and blow room air with desk fans.",
      "Increase the overclocking frequency on the server processors.",
      "Turn off the main circuit breaker for the entire building."
    ],
    correct: [0],
    explanation: "32°C ambient severely exceeds recommended ASHRAE server thresholds; graceful shutdown of non-essential loads preserves mission-critical systems and prevents thermal damage."
  },
  {
    text: "A workstation fails to recognize any USB flash drives inserted into its ports, yet USB keyboards and mice connected to the exact same ports function perfectly. What is the cause?",
    options: [
      "USB Mass Storage class device drivers are corrupted or disabled via Windows Group Policy / Registry restrictions (e.g., USBSTOR start value set to 4).",
      "The motherboard power supply is underpowered on the 12V rail.",
      "The monitor color calibration is incorrect.",
      "The Ethernet cable is unplugged."
    ],
    correct: [0],
    explanation: "HID peripherals (keyboards/mice) use standard HID drivers, while USB drives require USBSTOR; enterprise Group Policy often disables USBSTOR for data loss prevention."
  },
  {
    text: "When configuring Wake-on-LAN (WoL) for remote administrative maintenance after hours, which hardware and network settings must be correctly configured?",
    options: [
      "NIC power management settings (\"Allow this device to wake the computer\"), BIOS/UEFI \"Wake on PCIe / LAN\" enabled, and magic packets (UDP port 9/7) permitted across subnet routers.",
      "Bluetooth pairing enabled on all target machines.",
      "Disabling the Windows Firewall entirely.",
      "Setting the static IP address to loopback (127.0.0.1)."
    ],
    correct: [0],
    explanation: "WoL requires UEFI hardware support, NIC power standby enablement, and network routers configured to forward targeted magic broadcast packets."
  },
  {
    text: "A technician is troubleshooting a PC that experiences random Blue Screens with varying stop codes (MEMORY_MANAGEMENT, IRQL_NOT_LESS_OR_EQUAL, PFN_LIST_CORRUPT). Running Windows Memory Diagnostic reveals errors. What is the proper troubleshooting procedure to isolate whether the fault lies in the RAM sticks or the motherboard slots?",
    options: [
      "Test individual RAM sticks one by one in different slots, run MemTest86, and verify XMP stability.",
      "Replace the power supply unit immediately.",
      "Format the primary hard drive and reinstall Windows.",
      "Update the monitor firmware."
    ],
    correct: [0],
    explanation: "Multiple varying memory BSOD codes indicate RAM subsystem instability; isolating individual sticks across isolated DIMM slots with MemTest86 isolates the defect."
  },
  {
    text: "What is the function of the Trusted Platform Module (TPM 2.0) chip on modern enterprise motherboards in relation to data security?",
    options: [
      "It securely generates, stores, and manages cryptographic keys used for hardware-based disk encryption (e.g., BitLocker) and platform integrity verification.",
      "It accelerates 3D gaming graphics rendering performance.",
      "It regulates electrical voltage supplied to the CPU socket.",
      "It provides Wi-Fi 6 wireless connectivity."
    ],
    correct: [0],
    explanation: "TPM 2.0 serves as a hardware crypto-processor, binding encryption keys to system firmware measurements to protect storage volumes against tampering."
  },
  {
    text: "A technician notices that a network switch port is constantly toggling between \"Up\" and \"Down\" states (port flapping). What are the common physical and layer-2 causes to investigate?",
    options: [
      "Faulty patch cable crimping/damage, excessive cable length exceeding 100 meters, duplex mismatch, or bad transceiver/port hardware.",
      "Incorrect user login credentials in Active Directory.",
      "Low toner cartridge levels in office printers.",
      "Expired operating system license activation keys."
    ],
    correct: [0],
    explanation: "Port flapping is primarily caused by physical link degradation (poor crimping, excessive run length, damaged transceiver) or autonegotiation/duplex mismatch."
  },
  {
    text: "When designing an institutional maintenance schedule, what distinguishes \"Preventive Maintenance\" from \"Corrective Maintenance\"?",
    options: [
      "Preventive maintenance is proactive, scheduled servicing to prevent failures before they occur; corrective maintenance is reactive repair performed after equipment has broken down.",
      "Preventive maintenance is performed only after a catastrophic server crash.",
      "Corrective maintenance involves cleaning dust from keyboards.",
      "There is no functional difference between the two terms."
    ],
    correct: [0],
    explanation: "Preventive maintenance is scheduled, proactive upkeep (cleaning, patching, calibration); corrective maintenance is reactive diagnosis and repair following failure."
  },

  // Section 10: Mastery Level Troubleshooting & Institutional IT Governance
  {
    text: "A Level III maintenance specialist receives a report that an institutional database server experienced an unexpected kernel panic and rebooted. Upon reviewing the kernel dump files, the error points to a third-party kernel-mode driver (.sys file). What is the safest immediate recovery step?",
    options: [
      "Boot into Safe Mode (or Windows Recovery Environment), rename or remove the offending third-party driver file from System32\\drivers, and rollback the driver update.",
      "Reinstall the entire operating system and database management system from scratch.",
      "Replace the server motherboard and RAM modules.",
      "Increase the swap file size to 100 GB."
    ],
    correct: [0],
    explanation: "Third-party kernel driver panics are safely remediated in Safe Mode/WinRE by isolating the .sys file from System32\\drivers or rolling back the driver package."
  },
  {
    text: "When evaluating vendor tender submissions for enterprise firewalls, a Level III specialist notes that one vendor offers a firewall with throughput specifications tested using 1518-byte packets, while another tested using 64-byte packets. Why is testing with small (64-byte) packets a more rigorous test of firewall performance?",
    options: [
      "Small packets result in a vastly higher packet-per-second (pps) rate, exerting maximum stress on the CPU and packet-processing architecture of the firewall.",
      "Small packets consume more physical storage space on hard drives.",
      "Small packets require fiber optic cables instead of copper.",
      "Small packets bypass encryption algorithms automatically."
    ],
    correct: [0],
    explanation: "Small 64-byte packets generate high packets-per-second (PPS) rates for the same bandwidth, stressing route lookup, firewall rule evaluation, and CPU interrupts."
  },
  {
    text: "A user reports that their web browser constantly redirects to unauthorized search engines and displays pop-up advertisements even when visiting trusted sites. Inspection reveals modified proxy settings and malicious browser extensions. What sophisticated remediation must a Level III technician perform?",
    options: [
      "Reset browser settings to default, remove unauthorized policy entries from the Windows Registry (HKLM/HKCU Software\\Policies), clear local proxy configurations, and run advanced anti-malware scans.",
      "Clean the computer screen with microfiber cloth.",
      "Unplug the Ethernet cable and disable the network adapter permanently.",
      "Replace the computer's power supply unit."
    ],
    correct: [0],
    explanation: "Browser hijackers persist through enterprise registry policies, local proxy overrides, and malicious extensions; full remediation requires clearing policies, resetting proxies, and scanning."
  },
  {
    text: "What is the precise purpose of establishing a \"Golden Image\" for desktop deployment in an enterprise institution?",
    options: [
      "To provide a standardized, pre-configured, fully patched operating system image complete with required enterprise software and security configurations for rapid, error-free mass deployment.",
      "To create a backup copy of user personal photos and music files.",
      "To increase the resale value of old computers.",
      "To test experimental video games on employee workstations."
    ],
    correct: [0],
    explanation: "A golden master image standardizes baseline security configurations, drivers, and institutional applications across an organization's device fleet."
  },
  {
    text: "A technician is troubleshooting an intermittent issue where an enterprise workstation loses its Active Directory domain trust relationship (\"The trust relationship between this workstation and the primary domain failed\"). What is the most efficient method to repair this without recreating the user profile?",
    options: [
      "Use PowerShell (Test-ComputerSecureChannel -Repair) or re-join the computer to the domain using administrative credentials.",
      "Reinstall Windows and create a new local user account.",
      "Replace the computer's CMOS battery.",
      "Change the workstation computer name and reboot."
    ],
    correct: [0],
    explanation: "Broken domain secure channels occur when computer account passwords desynchronize; PowerShell's Test-ComputerSecureChannel -Repair resets credentials without touching user profiles."
  },
  {
    text: "When reviewing IT service delivery metrics, what does \"Mean Time Between Failures (MTBF)\" and \"Mean Time To Repair (MTTR)\" measure?",
    options: [
      "MTBF measures predicted reliability/average time elapsed between inherent failures; MTTR measures the average time required to troubleshoot and restore a failed system to operational status.",
      "MTBF measures internet download speed; MTTR measures printer paper capacity.",
      "MTBF measures employee typing speed; MTTR measures server boot time.",
      "MTBF and MTTR are identical metrics used for software license tracking."
    ],
    correct: [0],
    explanation: "MTBF evaluates component/system reliability and expected uptime between breakdowns; MTTR evaluates IT support efficiency in restoring service after failure."
  },
  {
    text: "A Level III specialist discovers that a shared network folder has \"Full Control\" permissions granted to the \"Everyone\" group. What is the security implication and required corrective action?",
    options: [
      "High security vulnerability allowing any network user or malware to modify, delete, or encrypt files; immediately restrict permissions based on the Principle of Least Privilege (PoLP).",
      "Excellent configuration for ease of access and file sharing across departments.",
      "Required setting for printer spooler operations.",
      "No security impact as long as antivirus is installed."
    ],
    correct: [0],
    explanation: "Full Control for Everyone leaves shares wide open to ransomware encryption and unauthorized exfiltration; access must be constrained via Principle of Least Privilege."
  },
  {
    text: "When planning a computer upgrade project across branch offices, a technician encounters legacy software applications that only run on Windows 7 32-bit, while the new hardware only supports Windows 10/11 64-bit. What is the proper architectural solution?",
    options: [
      "Virtualization (running the legacy app inside a secure virtual machine or container) or application modernization/refactoring, avoiding running unsupported insecure OS versions on bare metal.",
      "Downgrading the new enterprise hardware components to match 2010 standards.",
      "Connecting the old Windows 7 computer to the internet without security patches.",
      "Printing all software data on paper records."
    ],
    correct: [0],
    explanation: "Legacy 32-bit applications should be isolated inside secure virtual machines or modernized, rather than keeping unsupported, vulnerable operating systems on bare metal."
  },
  {
    text: "What is the fundamental role of a Level III Computer Maintenance Specialist regarding IT policy improvement?",
    options: [
      "To analyze recurring operational bottlenecks, technical challenges, and user feedback, and provide evidence-based proposals to management for updating institutional IT policies and maintenance procedures.",
      "To enforce parking regulations outside the office building.",
      "To determine executive salary structures.",
      "To design corporate marketing logos and social media banners."
    ],
    correct: [0],
    explanation: "Level III specialists synthesize field data, recurring incidents, and user needs to formulate strategic recommendations for modernizing institutional IT policies."
  },
  {
    text: "During complex troubleshooting of a multi-user database server crash, the Level III specialist has exhausted local diagnostic steps and verified hardware integrity. According to escalation protocols, what must be included in the technical handover report to higher-level system administrators or vendors?",
    options: [
      "Comprehensive event logs, minidump/kernel dump files, reproduction steps, timeline of symptoms, and a summary of all diagnostic actions already attempted.",
      "A simple statement saying \"Computer is broken, please fix.\"",
      "The personal contact numbers of all office employees.",
      "A handwritten note stating that software never works properly."
    ],
    correct: [0],
    explanation: "Professional incident escalation requires structured technical handover documentation: full crash dumps, chronological event logs, system state telemetry, and steps taken."
  }
];

console.log(`Total questions defined: ${questionsData.length}`);
if (questionsData.length !== 100) {
  console.error(`Expected 100 questions, got ${questionsData.length}`);
  process.exit(1);
}

// Verify each question has exactly 4 options and valid correct index
for (let i = 0; i < questionsData.length; i++) {
  const q = questionsData[i];
  if (!q.text || q.text.trim().length === 0) {
    throw new Error(`Question ${i + 1} has empty text!`);
  }
  if (!Array.isArray(q.options) || q.options.length !== 4) {
    throw new Error(`Question ${i + 1} does not have 4 options! Count: ${q.options ? q.options.length : 0}`);
  }
  if (!Array.isArray(q.correct) || q.correct.length === 0 || q.correct[0] < 0 || q.correct[0] > 3) {
    throw new Error(`Question ${i + 1} has invalid correct index: ${JSON.stringify(q.correct)}`);
  }
}
console.log('All 100 questions validated successfully!');

async function seedExam() {
  const now = new Date().toISOString();
  const categoryId = 'ad842eb6-4202-4a57-ae73-007ede7ea79f'; // Behavioral & Technical Competency
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c';   // admin

  const subjectId = crypto.randomUUID();
  const subjectSlug = 'computer-maintenance-3';
  const subjectName = 'Computer Maintenance III';

  const examTemplateId = crypto.randomUUID();
  const examSlug = 'computer-maintenance-3';
  const examName = 'Computer Maintenance III';
  const examDesc = '100 very hard, tricky, and scenario-based multiple-choice questions tailored specifically for Computer Maintenance III (covering Advanced Hardware Diagnostics, Motherboard & Power Systems, Networking, File Security & Backup, Procurement Technical Evaluation, Software Maintenance, Preventive Maintenance, Peripherals, and Mastery Troubleshooting).';

  // 1. Insert into SQLite
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));

  // Check if subject or exam already exists
  const existingSub = sqliteDb.prepare('SELECT id FROM Subject WHERE slug = ?').get(subjectSlug);
  let effectiveSubjectId = subjectId;
  if (existingSub) {
    effectiveSubjectId = existingSub.id;
    console.log(`Subject ${subjectSlug} already exists in SQLite with id ${effectiveSubjectId}`);
  } else {
    const insertSubStmt = sqliteDb.prepare(`
      INSERT INTO Subject (id, slug, name, categoryId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    insertSubStmt.run(subjectId, subjectSlug, subjectName, categoryId, now, now);
    console.log(`Created Subject ${subjectSlug} in SQLite`);
  }

  // Check if ExamTemplate exists
  const existingExam = sqliteDb.prepare('SELECT id FROM ExamTemplate WHERE slug = ?').get(examSlug);
  let effectiveExamId = examTemplateId;
  if (existingExam) {
    effectiveExamId = existingExam.id;
    console.log(`ExamTemplate ${examSlug} already exists in SQLite with id ${effectiveExamId}`);
  } else {
    const insertExamStmt = sqliteDb.prepare(`
      INSERT INTO ExamTemplate (
        id, slug, name, categoryId, subjectId, topicWeights, totalQuestions, durationMinutes,
        marksPerQuestion, negativeMarking, difficultyDistribution, randomizeQuestions,
        randomizeOptions, avoidPreviouslySeen, allowReuse, autoSubmitOnExpiry,
        passThresholdPercent, description, isPublic, publishedAt, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, NULL, 100, 120,
        1, 0, NULL, 1,
        1, 0, 0, 1,
        70, ?, 1, ?, ?, ?
      )
    `);
    insertExamStmt.run(examTemplateId, examSlug, examName, categoryId, effectiveSubjectId, examDesc, now, now, now);
    console.log(`Created ExamTemplate ${examSlug} in SQLite`);
  }

  // Delete existing questions for this subject in SQLite to avoid duplication if re-run
  sqliteDb.prepare('DELETE FROM Question WHERE subjectId = ?').run(effectiveSubjectId);

  // Insert Questions into SQLite
  const insertQStmt = sqliteDb.prepare(`
    INSERT INTO Question (
      id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
      options, correctOptionIndices, explanation, marks, negativeMarks, tags,
      learningObjectives, source, authorId, status, publishedAt, archivedAt,
      importId, canonicalIndices, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, NULL, 'HARD', 'SINGLE_CHOICE',
      ?, ?, ?, 1, NULL, '["hardware","networking","security","maintenance"]',
      NULL, 'Computer Maintenance III', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const questionsToInsert = [];
  for (let i = 0; i < questionsData.length; i++) {
    const q = questionsData[i];
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const ansJson = JSON.stringify(q.correct);
    insertQStmt.run(qId, qId, q.text, categoryId, effectiveSubjectId, optJson, ansJson, q.explanation, authorId, now, now, now);
    questionsToInsert.push({
      id: qId,
      questionId: qId,
      text: q.text,
      options: optJson,
      correct: ansJson,
      explanation: q.explanation
    });
  }
  console.log(`Inserted ${questionsToInsert.length} questions into SQLite successfully.`);

  // 2. Insert into PostgreSQL (Supabase)
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    const pgSubRes = await pool.query('SELECT id FROM "Subject" WHERE slug = $1', [subjectSlug]);
    let pgSubjectId = effectiveSubjectId;
    if (pgSubRes.rows.length > 0) {
      pgSubjectId = pgSubRes.rows[0].id;
      console.log(`Subject ${subjectSlug} already exists in Supabase with id ${pgSubjectId}`);
    } else {
      await pool.query(`
        INSERT INTO "Subject" (id, slug, name, "categoryId", "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [pgSubjectId, subjectSlug, subjectName, categoryId, now, now]);
      console.log(`Created Subject ${subjectSlug} in Supabase`);
    }

    const pgExamRes = await pool.query('SELECT id FROM "ExamTemplate" WHERE slug = $1', [examSlug]);
    if (pgExamRes.rows.length === 0) {
      await pool.query(`
        INSERT INTO "ExamTemplate" (
          id, slug, name, "categoryId", "subjectId", "topicWeights", "totalQuestions", "durationMinutes",
          "marksPerQuestion", "negativeMarking", "difficultyDistribution", "randomizeQuestions",
          "randomizeOptions", "avoidPreviouslySeen", "allowReuse", "autoSubmitOnExpiry",
          "passThresholdPercent", description, "isPublic", "publishedAt", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, 100, 120,
          1, false, NULL, true,
          true, false, false, true,
          70, $6, true, $7, $8, $9
        )
      `, [effectiveExamId, examSlug, examName, categoryId, pgSubjectId, examDesc, now, now, now]);
      console.log(`Created ExamTemplate ${examSlug} in Supabase`);
    } else {
      console.log(`ExamTemplate ${examSlug} already exists in Supabase`);
    }

    // Clear existing questions for this subject in Supabase
    await pool.query('DELETE FROM "Question" WHERE "subjectId" = $1', [pgSubjectId]);

    for (const q of questionsToInsert) {
      await pool.query(`
        INSERT INTO "Question" (
          id, "questionId", "questionText", "categoryId", "subjectId", "topicId", difficulty, "questionType",
          options, "correctOptionIndices", explanation, marks, "negativeMarks", tags,
          "learningObjectives", source, "authorId", status, "publishedAt", "archivedAt",
          "importId", "canonicalIndices", "createdAt", "updatedAt"
        ) VALUES (
          $1, $2, $3, $4, $5, NULL, 'HARD', 'SINGLE_CHOICE',
          $6, $7, $8, 1, NULL, '["hardware","networking","security","maintenance"]',
          NULL, 'Computer Maintenance III', $9, 'PUBLISHED', $10, NULL,
          NULL, '[0,1,2,3]', $11, $12
        )
      `, [q.id, q.questionId, q.text, categoryId, pgSubjectId, q.options, q.correct, q.explanation, authorId, now, now, now]);
    }
    console.log(`Inserted ${questionsToInsert.length} questions into Supabase PostgreSQL successfully.`);
  } finally {
    await pool.end();
  }
}

seedExam().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
