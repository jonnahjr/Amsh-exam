const { Pool } = require('pg');
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const rawQuestionsAndOptions = [
  // 1-10
  {
    num: 1,
    text: "Which component executes program instructions and performs arithmetic and logical operations?",
    options: ["RAM", "CPU", "SSD", "Power supply unit"],
    ans: "B",
    exp: "The CPU executes instructions and performs arithmetic and logical operations."
  },
  {
    num: 2,
    text: "A computer becomes noticeably slower when several applications are open, but its processor utilization is not consistently high. Which upgrade is most likely to help if memory usage is near its limit?",
    options: ["Replace the monitor", "Increase RAM capacity", "Install a higher-wattage power supply", "Replace the keyboard"],
    ans: "B",
    exp: "Additional RAM can reduce memory pressure and paging when physical memory is the bottleneck."
  },
  {
    num: 3,
    text: "What is the primary purpose of BIOS or UEFI firmware?",
    options: ["Store all user documents permanently", "Replace the operating system", "Initialize hardware and begin the boot process", "Provide internet connectivity without a network adapter"],
    ans: "C",
    exp: "BIOS/UEFI initializes hardware and starts the boot process."
  },
  {
    num: 4,
    text: "Which statement correctly distinguishes RAM from an SSD?",
    options: ["RAM is volatile working memory, while an SSD provides nonvolatile storage.", "RAM retains its contents indefinitely without power, while an SSD does not.", "Both are volatile memory devices.", "An SSD is used only to store firmware settings."],
    ans: "A",
    exp: "RAM is volatile working memory; SSDs retain data without power."
  },
  {
    num: 5,
    text: "A desktop computer powers on, but there is no display. Which action is a reasonable initial check?",
    options: ["Immediately replace the motherboard.", "Reinstall the operating system without checking hardware.", "Verify monitor power, display input, cable connections, and the selected output.", "Format the storage drive."],
    ans: "C",
    exp: "Verify the display path before attempting invasive repairs."
  },
  {
    num: 6,
    text: "What is the main function of a computer's power supply unit (PSU)?",
    options: ["Convert AC input power into the regulated DC outputs required by computer components.", "Store temporary application data.", "Translate domain names into IP addresses.", "Manage user passwords."],
    ans: "A",
    exp: "The PSU converts AC input into regulated DC power rails."
  },
  {
    num: 7,
    text: "Which interface is commonly associated with high-speed NVMe SSDs?",
    options: ["VGA", "PS/2", "RJ-45 Ethernet", "PCIe"],
    ans: "D",
    exp: "NVMe commonly operates over PCIe."
  },
  {
    num: 8,
    text: "Why must a technician check RAM compatibility before upgrading a computer?",
    options: ["RAM compatibility determines the monitor's resolution.", "The motherboard and processor impose supported memory types, capacities, speeds, and configurations.", "All RAM modules are electrically and physically interchangeable.", "RAM determines which printer driver must be installed."],
    ans: "B",
    exp: "RAM compatibility depends on platform specifications and supported configurations."
  },
  {
    num: 9,
    text: "What is the purpose of thermal paste between a processor and its heatsink?",
    options: ["Increase the processor's clock speed automatically", "Prevent all electrical faults in the motherboard", "Improve heat transfer by filling microscopic gaps between contact surfaces", "Protect files against malware"],
    ans: "C",
    exp: "Thermal paste fills microscopic gaps and improves heat transfer."
  },
  {
    num: 10,
    text: "Which practice best reduces the risk of electrostatic discharge (ESD) damage when handling internal computer components?",
    options: ["Work on carpet while wearing wool clothing.", "Touch exposed circuit contacts repeatedly.", "Connect components while the computer is powered on.", "Use appropriate ESD protection and follow safe power-disconnection procedures."],
    ans: "D",
    exp: "ESD precautions and safe disconnection reduce damage and injury risks."
  },

  // 11-20
  {
    num: 11,
    text: "A computer starts normally but cannot open a particular application. What should the technician investigate first?",
    options: ["The application-specific error, configuration, permissions, and relevant logs", "Replace the computer's power supply", "Change the office router's IP address", "Replace the monitor"],
    ans: "A",
    exp: "Application-specific evidence is more useful than replacing unrelated hardware."
  },
  {
    num: 12,
    text: "What is the main purpose of a device driver?",
    options: ["Encrypt every file on a computer", "Allow the operating system to communicate with and control a hardware device", "Replace the computer's firmware", "Assign public IP addresses to the office network"],
    ans: "B",
    exp: "Drivers enable the operating system to control hardware."
  },
  {
    num: 13,
    text: "Before reinstalling an operating system on an employee's computer, what should the technician do first?",
    options: ["Delete all partitions immediately.", "Disable all security software permanently.", "Confirm authorization, protect required data, verify backups, and identify the correct installation media.", "Remove the computer from the asset register."],
    ans: "C",
    exp: "Authorization and verified backups protect data before destructive work."
  },
  {
    num: 14,
    text: "Which Windows utility provides detailed records of application, system, and security events?",
    options: ["Paint", "Notepad", "Calculator", "Event Viewer"],
    ans: "D",
    exp: "Event Viewer displays Windows event logs."
  },
  {
    num: 15,
    text: "What is the purpose of installing operating-system and application security updates?",
    options: ["Address known vulnerabilities and, where applicable, correct defects or improve reliability", "Guarantee that a computer cannot be compromised", "Remove the need for backups", "Eliminate the need for antivirus protection"],
    ans: "A",
    exp: "Updates can correct vulnerabilities, defects, and reliability problems."
  },
  {
    num: 16,
    text: "Which Linux command normally displays the current IP addresses assigned to network interfaces?",
    options: ["mkdir", "ip addr", "pwd", "whoami"],
    ans: "B",
    exp: "ip addr displays Linux network interface addresses."
  },
  {
    num: 17,
    text: "Which Windows command is commonly used to check basic reachability to another IP address or hostname?",
    options: ["format", "diskpart", "ping", "taskkill"],
    ans: "C",
    exp: "ping tests basic IP reachability, although filtering can affect results."
  },
  {
    num: 18,
    text: "What is the main purpose of antivirus or endpoint-protection software?",
    options: ["Increase physical RAM capacity", "Repair broken motherboard circuits", "Replace user authentication", "Detect, block, or help remediate malicious software and suspicious activity"],
    ans: "D",
    exp: "Endpoint protection helps detect and block malicious activity."
  },
  {
    num: 19,
    text: "What should a technician do before installing software on a government-office computer?",
    options: ["Verify authorization, software legitimacy, compatibility, and licensing requirements.", "Install any version found on an unknown website.", "Disable all operating-system updates.", "Share the administrator password with the user."],
    ans: "A",
    exp: "Software must be authorized, legitimate, compatible, and properly licensed."
  },
  {
    num: 20,
    text: "A user cannot access a file stored on a shared drive. Which issue should be checked before changing permissions?",
    options: ["Monitor refresh rate", "The user's identity, group membership, existing permissions, and exact error", "Keyboard layout only", "Printer toner level"],
    ans: "B",
    exp: "Identity, group membership, permissions, and the exact error establish the access problem."
  },

  // 21-30
  {
    num: 21,
    text: "What is the primary function of DHCP?",
    options: ["Scan documents to PDF", "Encrypt files on a disk", "Automatically provide network configuration such as IP addresses to clients", "Repair corrupted Windows system files"],
    ans: "C",
    exp: "DHCP provides network configuration to clients."
  },
  {
    num: 22,
    text: "What does DNS primarily do?",
    options: ["Convert electrical power into DC power", "Assign RAM to applications", "Print documents over USB", "Resolve domain names to associated DNS records, including IP addresses"],
    ans: "D",
    exp: "DNS resolves names through DNS records, including records that map names to IP addresses."
  },
  {
    num: 23,
    text: "A computer has an IP address of 169.254.10.20 and cannot reach other office computers. What is a likely explanation?",
    options: ["The computer may have failed to obtain an IPv4 address from DHCP and assigned itself an APIPA address.", "The computer necessarily has a valid public IP address.", "The monitor driver is missing.", "The SSD is necessarily damaged."],
    ans: "A",
    exp: "An IPv4 APIPA address commonly indicates failure to obtain a DHCP lease."
  },
  {
    num: 24,
    text: "Which device normally forwards traffic between different IP networks?",
    options: ["Keyboard", "Router", "Scanner", "Unmanaged USB hub"],
    ans: "B",
    exp: "Routers forward traffic between IP networks."
  },
  {
    num: 25,
    text: "What is the purpose of a default gateway in a typical IPv4 client configuration?",
    options: ["Store the computer's BIOS settings", "Determine the user's password", "Forward traffic destined for networks outside the local subnet", "Assign a printer's paper size"],
    ans: "C",
    exp: "The default gateway is used to reach destinations outside the local subnet."
  },
  {
    num: 26,
    text: "A user can access a server by IP address but not by hostname. Which service should be investigated first?",
    options: ["CPU cooling", "Printer alignment", "Display adapter firmware", "DNS resolution"],
    ans: "D",
    exp: "IP access with hostname failure strongly suggests a name-resolution issue."
  },
  {
    num: 27,
    text: "Which cable connector is commonly used for wired Ethernet over twisted-pair cable?",
    options: ["RJ-45-style 8P8C connector", "HDMI", "VGA", "SATA"],
    ans: "A",
    exp: "An 8P8C connector is commonly called RJ-45 in Ethernet use."
  },
  {
    num: 28,
    text: "Two computers on the same subnet intermittently lose connectivity, and logs suggest duplicate IPv4 addresses. What is the best initial response?",
    options: ["Format both computers.", "Identify the conflicting devices and correct the IP assignment or DHCP reservation.", "Replace both monitors.", "Disable all network security controls."],
    ans: "B",
    exp: "Conflicting addresses must be identified and corrected at the source."
  },
  {
    num: 29,
    text: "A network printer is reachable, but print jobs remain queued on one Windows computer. Which service is a logical first software check?",
    options: ["Windows Audio", "Bluetooth Support Service", "Print Spooler", "Windows Time"],
    ans: "C",
    exp: "The Windows Print Spooler manages local print-job processing."
  },
  {
    num: 30,
    text: "A printer produces faded output even though the document looks correct on screen. What should be checked first?",
    options: ["The default gateway", "The user's Windows password", "The computer's RAM speed", "Printer consumables, print-quality settings, and the printer's own diagnostic output"],
    ans: "D",
    exp: "Check consumables, settings, and printer diagnostics before changing unrelated systems."
  },

  // 31-40
  {
    num: 31,
    text: "Why is preventive maintenance important?",
    options: ["It helps reduce avoidable failures and can identify developing problems before they cause service interruptions.", "It guarantees that hardware will never fail.", "It eliminates the need for maintenance records.", "It makes all computers immune to malware."],
    ans: "A",
    exp: "Preventive maintenance can reduce avoidable failures but cannot eliminate all failures."
  },
  {
    num: 32,
    text: "Which action is safest before opening a desktop computer for internal hardware maintenance?",
    options: ["Leave the system running for easier access.", "Shut it down, disconnect power, follow manufacturer guidance, and apply ESD precautions.", "Spray liquid cleaner directly onto the motherboard.", "Remove components while they are operating."],
    ans: "B",
    exp: "Safe shutdown, power disconnection, and ESD controls protect equipment and personnel."
  },
  {
    num: 33,
    text: "What is the primary purpose of a maintenance record?",
    options: ["Replace all technical troubleshooting", "Store users' personal passwords", "Document the fault, diagnosis, action taken, parts used, and service outcome", "Avoid reporting unresolved problems"],
    ans: "C",
    exp: "A maintenance record provides traceability and supports accountability."
  },
  {
    num: 34,
    text: "A scanner is not detected by a computer. Which action is most appropriate initially?",
    options: ["Replace the office router.", "Format the scanner's host computer.", "Disable the firewall permanently.", "Check power, cable or network connection, operating-system detection, and the appropriate driver."],
    ans: "D",
    exp: "Power, connection, device detection, and drivers are logical initial checks."
  },
  {
    num: 35,
    text: "What is the purpose of an ICT asset register?",
    options: ["Track equipment identity, location, assignment, status, and relevant inventory details", "Store employees' email passwords in plain text", "Replace all maintenance reports", "Record only equipment that has already failed"],
    ans: "A",
    exp: "An asset register supports tracking, accountability, and lifecycle management."
  },
  {
    num: 36,
    text: "Which backup practice provides the strongest basic evidence that recoverability is being maintained?",
    options: ["Assume the backup succeeded because a task was scheduled.", "Review backup results and periodically test restoration of selected data.", "Keep only one unverified copy on the original computer.", "Delete older backups immediately after every successful job."],
    ans: "B",
    exp: "A successful scheduled job is not proof of recoverability; test restoration."
  },
  {
    num: 37,
    text: "An employee asks a technician to copy confidential files to a personal USB drive. What is the best response?",
    options: ["Copy the files without asking why.", "Send the files through a personal email account.", "Follow institutional authorization and data-handling procedures before any transfer.", "Upload the files to a public file-sharing website."],
    ans: "C",
    exp: "Sensitive data transfers require proper authorization and approved handling."
  },
  {
    num: 38,
    text: "What is the safest first response when a technician suspects that a computer is infected with malware?",
    options: ["Immediately forward suspicious files to all employees.", "Ignore the symptoms until the next maintenance cycle.", "Disable every security control across the network.", "Follow the incident procedure, isolate the affected endpoint when appropriate, and report the suspicion."],
    ans: "D",
    exp: "Suspected malware requires prompt, controlled containment and reporting."
  },
  {
    num: 39,
    text: "Which statement best describes the principle of least privilege?",
    options: ["Give users only the access needed to perform their authorized duties.", "Give every user local administrator rights.", "Use one shared administrator account for all employees.", "Allow unrestricted access to confidential records."],
    ans: "A",
    exp: "Least privilege limits access to what is necessary for authorized duties."
  },
  {
    num: 40,
    text: "Why should a technician obtain appropriate approval before replacing a computer component using institutional stock?",
    options: ["To avoid recording the repair", "To maintain authorization, accountability, inventory accuracy, and proper use of public resources", "To make the computer's warranty invalid", "To avoid testing the replacement part"],
    ans: "B",
    exp: "Approval and stock records protect public assets and ensure accountability."
  },

  // 41-50
  {
    num: 41,
    text: "A computer repeatedly shuts down under heavy workload. Which cause should be investigated among the initial possibilities?",
    options: ["The desktop wallpaper", "The user's email signature", "Overheating, power-delivery problems, and hardware faults", "The printer's paper size"],
    ans: "C",
    exp: "Load-related shutdowns may result from thermal, power, or hardware faults."
  },
  {
    num: 42,
    text: "Which is the most appropriate general troubleshooting sequence?",
    options: ["Replace components until the fault disappears, without recording actions.", "Reinstall the operating system before asking what happened.", "Change several settings at once and assume the last change fixed the problem.", "Identify symptoms, gather evidence, test likely causes, apply a controlled fix, and verify the outcome."],
    ans: "D",
    exp: "Evidence-based diagnosis and post-repair verification reduce unnecessary changes."
  },
  {
    num: 43,
    text: "What is the purpose of a POST (Power-On Self-Test)?",
    options: ["Perform initial hardware checks during startup", "Create a user account in Active Directory", "Assign a DHCP lease to every device", "Back up user documents to a network share"],
    ans: "A",
    exp: "POST performs initial hardware checks during startup."
  },
  {
    num: 44,
    text: "A computer's system date and time repeatedly reset after being powered off. Which component may require inspection?",
    options: ["Ethernet patch cable", "CMOS/RTC battery, where applicable", "Printer toner cartridge", "Monitor stand"],
    ans: "B",
    exp: "The RTC/CMOS battery may fail to preserve clock or firmware settings."
  },
  {
    num: 45,
    text: "Which Windows command checks protected system files and attempts to repair integrity violations?",
    options: ["ipconfig /release", "net use", "sfc /scannow", "hostname"],
    ans: "C",
    exp: "sfc /scannow checks and attempts to repair protected Windows system files."
  },
  {
    num: 46,
    text: "Which Linux command is commonly used on systemd-based distributions to inspect recent system journal messages?",
    options: ["lsblk", "chmod", "uname -r", "journalctl"],
    ans: "D",
    exp: "journalctl reads the systemd journal."
  },
  {
    num: 47,
    text: "What should be done after replacing a faulty RAM module?",
    options: ["Confirm that the system detects the expected memory and run suitable stability or diagnostic checks.", "Assume the repair succeeded without testing.", "Delete the asset register.", "Disable the operating system's security updates."],
    ans: "A",
    exp: "Confirm detection and stability after changing memory hardware."
  },
  {
    num: 48,
    text: "A user reports that the computer is slow. Which first step provides the most useful evidence?",
    options: ["Immediately purchase a new computer.", "Clarify when the slowdown occurs and examine resource usage, startup activity, storage health, and relevant logs.", "Delete all the user's files.", "Disable endpoint protection permanently."],
    ans: "B",
    exp: "Establishing symptoms and collecting resource and health evidence guides diagnosis."
  },
  {
    num: 49,
    text: "Which action is most appropriate when a fault cannot be resolved within the technician's authority or technical capacity?",
    options: ["Conceal the fault.", "Mark the request resolved without testing.", "Document findings and attempted fixes, then escalate to the responsible supervisor or specialist.", "Replace unrelated equipment."],
    ans: "C",
    exp: "Escalation should include documented findings and prior troubleshooting."
  },
  {
    num: 50,
    text: "Which measure best demonstrates that a maintenance request has been completed properly?",
    options: ["The technician has spent a long time on the task.", "The user has stopped complaining.", "A replacement part was installed, regardless of the result.", "The reported problem has been tested against the expected outcome, and the resolution is documented."],
    ans: "D",
    exp: "Completion requires testing against expected results and recording the outcome."
  },

  // Section B: 51-60
  {
    num: 51,
    text: "A desktop powers on, its fans spin, but it produces no display. A known-good monitor and cable have been tested. The motherboard's diagnostic indicator remains at DRAM. What is the best next step?",
    options: ["Reinstall Windows using the original installation media.", "Disconnect all storage devices and assume the SSD caused the fault.", "Power down safely, reseat the RAM, test supported modules individually in recommended slots, and check motherboard diagnostic guidance.", "Replace the monitor despite the successful test."],
    ans: "C",
    exp: "The DRAM indicator directs attention to memory installation, modules, slots, and compatibility."
  },
  {
    num: 52,
    text: "A computer restarts under CPU load. Temperatures rise rapidly, and the CPU cooling fan is intermittently stationary. What is the most defensible action?",
    options: ["Disable thermal protection in firmware.", "Stop load testing, inspect the cooling assembly and fan connection, repair the cooling fault, then verify temperatures under controlled load.", "Increase CPU voltage to stabilize operation.", "Reinstall the operating system before inspecting cooling."],
    ans: "B",
    exp: "A failed cooling fan requires safe correction and temperature verification."
  },
  {
    num: 53,
    text: "A workstation's firmware reports that no bootable device is available immediately after a storage upgrade. Which check should come first?",
    options: ["Confirm that the drive is detected, its connection is secure, and the firmware boot configuration is compatible with the installed operating system.", "Replace the keyboard.", "Clear every partition on the drive.", "Disable all USB ports."],
    ans: "A",
    exp: "Confirm drive detection, connections, and boot configuration before changing data."
  },
  {
    num: 54,
    text: "A computer intermittently fails memory tests. It has two RAM modules installed. What is the best diagnostic method?",
    options: ["Increase RAM voltage beyond the manufacturer's limits.", "Reinstall the operating system several times.", "Assume both modules are faulty and discard them.", "Test modules individually in supported slots, then compare results to isolate a module, slot, or configuration problem."],
    ans: "D",
    exp: "Individual module and slot tests help isolate the source of intermittent memory errors."
  },
  {
    num: 55,
    text: "A technician is upgrading RAM in an older office computer. The new module fits physically but is not detected. What is the best next step?",
    options: ["Force the module into the slot.", "Verify the supported memory generation, capacity, rank/density, speed, and motherboard/firmware compatibility.", "Format the system drive.", "Change the default gateway."],
    ans: "B",
    exp: "Physical fit does not prove electrical or platform compatibility."
  },
  {
    num: 56,
    text: "A drive reports a SMART warning and has begun producing read errors. The computer contains important unbacked-up records. What should be prioritized?",
    options: ["Run repeated intensive surface scans before preserving data.", "Defragment the drive repeatedly.", "Minimize unnecessary writes and use an appropriate recovery or imaging strategy, escalating if the data is critical.", "Install more applications to determine whether the drive recovers."],
    ans: "C",
    exp: "A failing drive with important data should be protected from unnecessary writes; recovery may require imaging or specialist support."
  },
  {
    num: 57,
    text: "A desktop does not power on. The outlet and power cable are known good, but there are no lights or fan activity. Which action is safest and most informative before replacing the motherboard?",
    options: ["Check external power connections and approved PSU diagnostics, then isolate components using manufacturer-recommended procedures.", "Open the PSU and probe its high-voltage circuitry without specialized authorization or training.", "Replace the SSD.", "Reinstall Windows."],
    ans: "A",
    exp: "Start with safe external checks and approved power diagnostics; do not open a PSU casually."
  },
  {
    num: 58,
    text: "A computer displays a firmware error indicating a CPU fan failure, although the fan appears to spin. What should the technician do?",
    options: ["Ignore all cooling warnings.", "Disable the CPU fan monitoring permanently.", "Replace the operating system.", "Verify fan connection, RPM signal, fan compatibility, cooling installation, and the motherboard's monitoring configuration."],
    ans: "D",
    exp: "Fan rotation alone does not prove that RPM monitoring and cooling are functioning correctly."
  },
  {
    num: 59,
    text: "After a BIOS/UEFI update, a workstation no longer boots into its operating system. Which approach is best?",
    options: ["Immediately erase the disk.", "Check firmware boot mode, boot order, storage-controller settings, and documented recovery procedures before changing disk contents.", "Replace the monitor.", "Change the user's password."],
    ans: "B",
    exp: "Firmware updates can change boot mode, order, or controller configuration."
  },
  {
    num: 60,
    text: "A computer produces beep codes at startup. Different motherboard models use different code patterns. What is the correct response?",
    options: ["Interpret every beep pattern as a RAM failure.", "Ignore the beeps if the fans spin.", "Identify the motherboard or system model and consult its manufacturer-specific diagnostic documentation.", "Replace all internal components simultaneously."],
    ans: "C",
    exp: "POST beep codes are manufacturer- and model-dependent."
  },

  // 61-70
  {
    num: 61,
    text: "A workstation displays “Operating system not found.” Firmware detects the SSD. What should the technician check next?",
    options: ["Verify boot order and boot mode, then inspect the bootloader and partition configuration using appropriate recovery tools without unnecessarily modifying user data.", "Replace the monitor.", "Change the printer driver.", "Disable DHCP."],
    ans: "A",
    exp: "Check boot configuration and bootloader evidence without prematurely altering user data."
  },
  {
    num: 62,
    text: "A Windows computer enters an automatic-repair loop after a recent driver installation. What is the most appropriate first recovery strategy?",
    options: ["Format the system partition immediately.", "Disable all backups.", "Delete the user profile.", "Use the recovery environment to attempt an appropriate rollback, such as System Restore or removing the recent update/driver, while protecting data."],
    ans: "D",
    exp: "A recent driver or update may be reversible through the recovery environment."
  },
  {
    num: 63,
    text: "A workstation repeatedly crashes with different stop codes after a RAM upgrade. The previous configuration was stable. What is the best initial response?",
    options: ["Replace the router.", "Return to the known-good memory configuration and test the new RAM against supported specifications and diagnostics.", "Disable all security updates.", "Delete system logs."],
    ans: "B",
    exp: "Returning to the last stable configuration tests whether the new RAM or its configuration caused instability."
  },
  {
    num: 64,
    text: "A Windows application fails to start, and Event Viewer shows repeated application faults after an update. Other applications work. What is the best approach?",
    options: ["Replace the computer's PSU.", "Change the DHCP scope.", "Correlate the events with the update, verify application requirements, and test a supported repair or rollback before broader changes.", "Reformat every workstation in the department."],
    ans: "C",
    exp: "Correlating application faults with recent changes supports targeted repair or rollback."
  },
  {
    num: 65,
    text: "A Windows system has suspected component-store corruption. sfc /scannow reports that some files could not be repaired. Which action is generally appropriate on a supported Windows version?",
    options: ["Use the appropriate DISM component-store repair procedure, then rerun SFC and review the results.", "Disable the storage drive.", "Delete the Windows directory manually.", "Replace the display cable."],
    ans: "A",
    exp: "DISM can repair the component store on supported Windows systems; SFC can then be rerun."
  },
  {
    num: 66,
    text: "A user accidentally deletes important files from a failing HDD. The files are not backed up. Which action best preserves recovery prospects?",
    options: ["Save recovered files back onto the same drive.", "Install several recovery utilities onto the affected drive.", "Run disk cleanup and defragmentation.", "Stop unnecessary use of the drive and recover from a verified backup or work from a suitable image using another storage device."],
    ans: "D",
    exp: "Continued use and writes can reduce recovery prospects; use verified backups or a suitable image and separate recovery storage."
  },
  {
    num: 67,
    text: "A backup job reports “successful,” but a test restoration produces unreadable files. What does this indicate?",
    options: ["The backup can be considered reliable because the job completed.", "Backup integrity or recovery procedures are not yet proven; investigate the failure and retest a corrected backup and restore process.", "The original computer must be replaced.", "No further action is needed if the backup log is green."],
    ans: "B",
    exp: "Backup-job success does not guarantee readable data or a successful restoration procedure."
  },
  {
    num: 68,
    text: "An office plans to reinstall Windows on a computer used for official records. Which pre-installation checklist is the most appropriate?",
    options: ["Confirm only the monitor resolution.", "Delete all partitions before receiving authorization.", "Confirm authorization, identify required data and application settings, verify a restorable backup, record the device identity, and prepare approved installation media and drivers.", "Copy every user file to a public cloud folder without approval."],
    ans: "C",
    exp: "Authorization, data preservation, device identity, approved media, and drivers should be established before reinstallation."
  },
  {
    num: 69,
    text: "A workstation is encrypted and displays a recovery-key prompt after a firmware or boot-configuration change. What should the technician do?",
    options: ["Follow the institution's authorized recovery process and retrieve the legitimate recovery key from its approved source; avoid destructive actions.", "Attempt to bypass encryption by deleting system files.", "Upload the disk image to an unknown online service.", "Repeatedly change firmware settings without documenting them."],
    ans: "A",
    exp: "Use the legitimate recovery key and approved recovery process; destructive bypass attempts risk data loss."
  },
  {
    num: 70,
    text: "A user reports missing files after an antivirus tool quarantines suspicious items. What is the safest response?",
    options: ["Disable antivirus across the institution.", "Restore all quarantined files without review.", "Delete the quarantine history immediately.", "Review the detection and file context, confirm authorization and legitimacy, and restore only if the files are verified as safe and restoration is approved."],
    ans: "D",
    exp: "Quarantined files should be restored only after legitimate status and authorization are established."
  },

  // 71-80
  {
    num: 71,
    text: "A workstation has an IP address, subnet mask, and default gateway, but cannot reach an external IP address. Other computers on the same VLAN work normally. What is the best sequence?",
    options: ["Reinstall all applications immediately.", "Compare the workstation's IP configuration with a working peer, test local gateway reachability, inspect route and local firewall settings, and continue based on results.", "Replace the office's core switch immediately.", "Change the DNS server before testing IP connectivity."],
    ans: "B",
    exp: "Compare configurations and test progressively from local network to gateway and beyond."
  },
  {
    num: 72,
    text: "Several computers on one subnet receive 169.254.x.x addresses after a switch replacement. What should be investigated first?",
    options: ["Whether every workstation has a damaged SSD", "Whether all monitors are configured correctly", "Switch port/VLAN configuration and DHCP reachability, including relay or uplink configuration where applicable", "The printer toner levels"],
    ans: "C",
    exp: "Multiple APIPA addresses after a switch replacement suggest a shared VLAN/uplink/DHCP-path problem."
  },
  {
    num: 73,
    text: "A workstation can ping its default gateway and a known external IP address, but users cannot browse sites by name. Which test most directly investigates the likely fault?",
    options: ["Query a known domain using an approved DNS diagnostic tool, compare configured DNS servers, and verify resolution.", "Replace the workstation's RAM.", "Reset the monitor.", "Reinstall the printer driver."],
    ans: "A",
    exp: "DNS queries directly test name resolution and configured resolver behavior."
  },
  {
    num: 74,
    text: "Two computers have the same static IPv4 address. Both show intermittent connectivity. What is the best resolution?",
    options: ["Increase both computers' RAM.", "Disable all switching.", "Change both default gateways to random addresses.", "Identify both devices, assign unique authorized addresses, and check DHCP reservations and the IP-address management records to prevent recurrence."],
    ans: "D",
    exp: "Unique authorized addresses and corrected reservations prevent recurring conflicts."
  },
  {
    num: 75,
    text: "A user moves a desktop to a different office. Link lights are on, but the workstation cannot reach local services. The new wall port belongs to a different VLAN. What should be done?",
    options: ["Disable the workstation firewall permanently.", "Verify the intended network assignment and have the authorized network administrator correct the VLAN/port configuration or approve the required access.", "Reinstall the operating system.", "Replace the desktop's storage drive."],
    ans: "B",
    exp: "VLAN and port assignments must match the approved network design."
  },
  {
    num: 76,
    text: "A shared network printer works from one department but not another. The affected department recently changed network segments. What is the most useful first investigation?",
    options: ["Replace the printer's fuser.", "Change every user's password.", "Verify IP reachability, routing or VLAN policy, firewall/ACL rules, and printer access from the affected segment.", "Reinstall Windows on every computer."],
    ans: "C",
    exp: "Segment changes can affect routing, filtering, and access to printer services."
  },
  {
    num: 77,
    text: "Print jobs remain stuck for several users on one Windows print server. Restarting an individual workstation does not help. What is the best approach?",
    options: ["Check print-server queue and spooler health, review relevant logs, and follow approved procedures to clear or repair the affected queue while preserving required jobs where possible.", "Replace every user's keyboard.", "Delete the institution's asset register.", "Disable the network switch."],
    ans: "A",
    exp: "A server-side queue or spooler fault can affect many clients simultaneously."
  },
  {
    num: 78,
    text: "A network printer shows as online, but its address changes periodically and users lose access. What is the most appropriate corrective measure?",
    options: ["Replace the printer's display.", "Give every user administrator privileges.", "Change the printer's address without informing anyone.", "Coordinate an authorized stable addressing solution, such as a DHCP reservation or approved static configuration, and update records."],
    ans: "D",
    exp: "Stable addressing and accurate records reduce failures caused by address changes."
  },
  {
    num: 79,
    text: "A workstation can reach local servers but cannot access a particular external service. Other external services work. Which conclusion is most defensible?",
    options: ["The motherboard is necessarily defective.", "Investigate service-specific DNS, routing, proxy, firewall, TLS, or application dependencies before assuming a general network failure.", "All network cables must be replaced.", "The computer's RAM is necessarily incompatible."],
    ans: "B",
    exp: "Service-specific failure can involve DNS, proxy, firewall, TLS, routing, or application dependencies."
  },
  {
    num: 80,
    text: "A technician suspects that a switch port is negotiating at 100 Mbps rather than 1 Gbps. Which method provides the strongest initial evidence?",
    options: ["Judge the speed from the colour of the Ethernet cable.", "Change the monitor's refresh rate.", "Inspect the negotiated link speed, adapter and switch-port status, cable category/condition, and supported configuration.", "Reinstall all office software."],
    ans: "C",
    exp: "Negotiated link status and cable/port capabilities provide direct evidence."
  },

  // 81-90
  {
    num: 81,
    text: "An employee opens a suspicious attachment, and endpoint protection reports a possible compromise. What is the best immediate action?",
    options: ["Follow the incident-response procedure, isolate the endpoint as directed, preserve relevant evidence, and promptly notify the authorized security contact.", "Forward the attachment to colleagues to see whether it opens.", "Delete all system logs to reduce storage use.", "Ignore the alert if the computer still works."],
    ans: "A",
    exp: "Containment, evidence preservation, and reporting are essential incident-response steps."
  },
  {
    num: 82,
    text: "A critical security update is available, but the affected application is used for essential public services. What should the technician do?",
    options: ["Permanently disable updates.", "Install the update on all systems without any consideration of service impact or authorization.", "Ignore the vulnerability indefinitely.", "Follow the patch-management process: assess urgency and compatibility, obtain required approval, test where feasible, deploy appropriately, and verify."],
    ans: "D",
    exp: "Risk-based, authorized patching balances vulnerability exposure and service continuity."
  },
  {
    num: 83,
    text: "A technician discovers that several computers in the asset register have been physically moved and reassigned without updated records. What is the best response?",
    options: ["Delete the affected devices from the register.", "Verify the actual devices, locations, assignments, and identifiers; update the authorized records and report discrepancies according to procedure.", "Assume the records are correct.", "Record all computers as permanently broken."],
    ans: "B",
    exp: "Physical verification and accurate asset records restore traceability."
  },
  {
    num: 84,
    text: "A maintenance request describes “computer not working,” with no further details. Which action is most efficient?",
    options: ["Replace the computer immediately.", "Close the request because it lacks details.", "Contact the user, clarify symptoms and impact, establish when the fault began, and perform a structured initial assessment.", "Change all user passwords."],
    ans: "C",
    exp: "Clarifying symptoms and impact prevents premature, misdirected repairs."
  },
  {
    num: 85,
    text: "A technician repeatedly fixes the same overheating problem on a workstation. What is the best long-term approach?",
    options: ["Investigate root causes such as blocked airflow, fan failure, dust accumulation, workload, and installation conditions; document and verify a corrective preventive action.", "Continue replacing parts without recording the work.", "Disable thermal protection.", "Tell the user to ignore shutdowns."],
    ans: "A",
    exp: "Repeated faults require root-cause investigation and preventive action."
  },
  {
    num: 86,
    text: "An office has one spare computer and several open service requests. One request involves a workstation used for time-critical public service; another concerns a nonessential personal productivity application. What is the best allocation method?",
    options: ["Give the spare to the employee who complains most loudly.", "Give it to the most senior employee automatically.", "Keep it unused regardless of service impact.", "Assess service criticality, number of users affected, urgency, available workarounds, and institutional priorities, then document the allocation decision."],
    ans: "D",
    exp: "Criticality, impact, urgency, and workarounds provide a defensible allocation basis."
  },
  {
    num: 87,
    text: "A replacement power supply is available, but its connector configuration and electrical capacity have not been verified. What should the technician do?",
    options: ["Install it because it fits inside the case.", "Verify manufacturer compatibility, required connectors, power capacity, form factor, and safety specifications before installation.", "Modify the PSU wiring without an approved procedure.", "Use any power supply with the same brand name."],
    ans: "B",
    exp: "Electrical and connector compatibility must be verified before installation."
  },
  {
    num: 88,
    text: "A laptop battery is swollen and the case is separating. What is the safest response?",
    options: ["Press the case together and continue charging.", "Puncture the battery to release gas.", "Stop using and charging the device, avoid compressing or puncturing the battery, and arrange authorized safe handling and replacement.", "Heat the battery to reshape it."],
    ans: "C",
    exp: "A swollen lithium-ion battery presents a potential fire and injury hazard."
  },
  {
    num: 89,
    text: "A technician needs to clean dust from a computer in a public office. Which approach is most appropriate?",
    options: ["Shut down and disconnect power as required, use suitable equipment and ESD precautions, avoid damaging fans or components, and follow manufacturer guidance.", "Spray water directly into the powered computer.", "Use a metal tool to scrape dust from circuit boards.", "Spin cooling fans at extreme speeds with compressed air without restraint."],
    ans: "A",
    exp: "Proper isolation, ESD protection, and controlled cleaning reduce injury and equipment damage."
  },
  {
    num: 90,
    text: "An employee requests local administrator rights to install software quickly. The software is not on the approved list. What is the best response?",
    options: ["Give permanent administrator rights immediately.", "Share the technician's privileged account.", "Disable application controls.", "Verify the business need and use the approved software authorization and installation process, applying least privilege."],
    ans: "D",
    exp: "Approved software and least privilege reduce security and licensing risks."
  },

  // 91-100
  {
    num: 91,
    text: "A Windows workstation has unexpected network connectivity problems. Which command gives a useful overview of its IP address, subnet mask, default gateway, and DNS configuration?",
    options: ["sfc /scannow", "ipconfig /all", "chkdsk", "tasklist"],
    ans: "B",
    exp: "ipconfig /all shows detailed Windows network configuration."
  },
  {
    num: 92,
    text: "On a Linux system using systemd, a service fails after reboot. Which command is most useful for inspecting the service's status and recent failure details?",
    options: ["pwd", "touch service.log", "systemctl status service-name", "echo $HOME"],
    ans: "C",
    exp: "systemctl status reports service state and often relevant failure information."
  },
  {
    num: 93,
    text: "A Linux workstation's root filesystem is full, causing applications to fail. Which initial investigation is most appropriate?",
    options: ["Use df -h to identify full filesystems and suitable du commands to locate large directories before safely removing or rotating approved data.", "Delete every file in /var.", "Reformat the disk immediately.", "Change the default gateway."],
    ans: "A",
    exp: "df -h identifies full filesystems; du helps locate space consumption."
  },
  {
    num: 94,
    text: "A Windows workstation has repeated unexpected restarts. Which combination of evidence is most useful for root-cause analysis?",
    options: ["Desktop wallpaper and icon spacing only", "Printer paper size and keyboard language only", "The user's preferred browser theme only", "Reliability Monitor/Event Viewer records correlated with crash dumps, hardware diagnostics, temperature, and recent configuration changes"],
    ans: "D",
    exp: "Correlating logs, dumps, diagnostics, temperatures, and changes helps distinguish likely causes."
  },
  {
    num: 95,
    text: "A technician suspects a damaged disk but wants to distinguish filesystem errors from physical-drive problems. Which approach is best?",
    options: ["Treat any filesystem error as proof that the disk is physically defective.", "Review SMART/vendor diagnostics and system storage events, protect data, and use appropriate filesystem checks after assessing drive health and recovery risk.", "Run repeated write-intensive repairs before securing important data.", "Ignore the user's reports of read errors."],
    ans: "B",
    exp: "SMART, vendor diagnostics, logs, and cautious filesystem checks help distinguish drive-health and filesystem issues."
  },
  {
    num: 96,
    text: "A new application causes startup delays on many computers. What is the best investigation?",
    options: ["Replace all monitors.", "Disable every startup service.", "Compare affected and unaffected machines, examine startup impact and logs, verify application requirements, and test a controlled rollback or configuration correction.", "Replace every network switch."],
    ans: "C",
    exp: "Comparison and controlled testing isolate the update or application responsible."
  },
  {
    num: 97,
    text: "A technician changes several BIOS settings while troubleshooting, and the computer starts working. The original fault is not understood. What should happen next?",
    options: ["Document the original and final settings, identify the change associated with recovery where practical, validate stability, and follow configuration-control procedures.", "Keep no record because the system works.", "Change additional settings without testing.", "Reset every computer in the institution to the same configuration."],
    ans: "A",
    exp: "Configuration documentation and validation make a repair reproducible and auditable."
  },
  {
    num: 98,
    text: "A preventive-maintenance plan shows that many devices are overdue. Staffing is limited. What is the most defensible response?",
    options: ["Mark all overdue tasks as completed.", "Stop maintaining all devices until staffing increases.", "Service only devices owned by senior employees.", "Prioritize according to risk, age/condition, service criticality, failure history, and operational impact; document the revised schedule and escalate resource constraints."],
    ans: "D",
    exp: "Risk-based scheduling is more defensible than falsely recording completion or treating all devices equally."
  },
  {
    num: 99,
    text: "A repaired workstation passes a short startup test but fails during normal departmental work. What does this suggest?",
    options: ["The repair is definitely complete.", "The verification did not reproduce the operational conditions; test the relevant workload and peripherals, gather logs, and continue diagnosis.", "The user must be at fault.", "The asset register should be deleted."],
    ans: "B",
    exp: "Testing must reproduce realistic workloads and peripherals to establish service readiness."
  },
  {
    num: 100,
    text: "A technician has identified a likely cause, but the proposed repair risks data loss and would interrupt a critical office service. What is the best next step?",
    options: ["Perform the repair without approval because the diagnosis is likely correct.", "Hide the service risk from the supervisor.", "Assess data and service risks, verify backup and recovery options, obtain required authorization, plan a controlled repair window, and communicate the impact.", "Close the service request without informing the user."],
    ans: "C",
    exp: "Risk assessment, backup verification, approval, and planned downtime protect data and essential services."
  },

  // Section C: 101-130
  {
    num: 101,
    text: "You discover that a colleague has marked several maintenance requests as completed even though the computers have not been tested. What is the best response?",
    options: ["Ignore it because the colleague is experienced.", "Discuss the discrepancy professionally, verify the service records, and report unresolved concerns through the appropriate supervisory process.", "Copy the same practice to keep performance figures high.", "Publicly accuse the colleague without checking the facts."],
    ans: "B",
    exp: "Integrity and accountability: Verify facts, address the issue professionally, and use appropriate reporting channels."
  },
  {
    num: 102,
    text: "A senior employee asks you to use institutional spare parts to repair a computer at the employee's home without authorization. What should you do?",
    options: ["Agree because the employee is senior.", "Use the parts but omit the transaction from the register.", "Follow the approved asset and maintenance procedures, decline the unauthorized use, and explain the proper process.", "Give the employee the spare parts to install personally."],
    ans: "C",
    exp: "Public-resource stewardship: Institutional stock must be used for authorized purposes and recorded correctly."
  },
  {
    num: 103,
    text: "You accidentally damage an institutional keyboard while performing maintenance. What is the most professional response?",
    options: ["Report the incident honestly, document the circumstances, and follow the institutional procedure for damaged property.", "Put the keyboard back and hope nobody notices.", "Blame the user who submitted the computer.", "Alter the asset register to hide the damage."],
    ans: "A",
    exp: "Honesty: Prompt disclosure and documentation support accountability and proper corrective action."
  },
  {
    num: 104,
    text: "A colleague asks you to share your administrator password because their account cannot install a driver. What is the best response?",
    options: ["Share the password for five minutes.", "Write the password on a paper near the workstation.", "Create one shared administrator password for the entire team.", "Refuse to share credentials and use the approved privileged-access or authorized installation process."],
    ans: "D",
    exp: "Access control: Credentials must not be shared; use authorized privileged access."
  },
  {
    num: 105,
    text: "A vendor offers you a personal gift in exchange for recommending the vendor's computer parts in an institutional procurement. What should you do?",
    options: ["Accept it if the parts are reasonably priced.", "Decline the improper inducement and disclose the offer through the appropriate institutional channel.", "Recommend the vendor without recording the interaction.", "Ask for a larger gift before deciding."],
    ans: "B",
    exp: "Anti-corruption: Declining and reporting improper influence protects procurement integrity."
  },
  {
    num: 106,
    text: "You realize that your maintenance report contains an incorrect claim that a backup was verified. What is the best action?",
    options: ["Leave it unchanged because the report has already been submitted.", "Delete the whole maintenance history.", "Correct the record transparently, disclose the error to the relevant supervisor, and perform the required backup verification.", "Ask a colleague to take responsibility for the error."],
    ans: "C",
    exp: "Accuracy and ownership: Correct the record and complete the verification that was incorrectly claimed."
  },
  {
    num: 107,
    text: "A manager asks you to bypass an established equipment-issuance procedure to give a computer to a favored employee. What should guide your decision?",
    options: ["Apply the approved procedure consistently, explain the requirement respectfully, and escalate any instruction that appears improper.", "Follow the instruction because the manager is responsible for everything.", "Give the computer away without updating the asset register.", "Refuse to serve any employee until the manager apologizes."],
    ans: "A",
    exp: "Fairness and procedural compliance: Apply the same approved rules and escalate improper instructions appropriately."
  },
  {
    num: 108,
    text: "During maintenance, you discover confidential employee records unrelated to the technical problem. What should you do?",
    options: ["Read them to understand the department better.", "Copy them for future troubleshooting.", "Send them to your personal email for safekeeping.", "Avoid unnecessary access, protect the records, and follow authorized handling and incident-reporting procedures if exposure occurred."],
    ans: "D",
    exp: "Confidentiality: Avoid unnecessary access and follow handling/reporting procedures."
  },
  {
    num: 109,
    text: "An employee asks you to send a database containing sensitive institutional information to a personal email address so the employee can work at home. What is the best response?",
    options: ["Send it because the employee is authorized to view the database at work.", "Verify the request against data-handling rules and use only approved, authorized transfer and remote-access arrangements.", "Upload the database to a public link.", "Copy it to your personal device and decide later."],
    ans: "B",
    exp: "Data protection: Legitimate workplace access does not automatically authorize personal transfers."
  },
  {
    num: 110,
    text: "You suspect that an employee has connected an unauthorized device to the office network. You have not confirmed malicious activity. What should you do?",
    options: ["Publicly accuse the employee of hacking.", "Ignore the issue because no outage has occurred.", "Preserve relevant observations, follow the approved security process, and notify the authorized IT/security contact for investigation.", "Delete network logs to prevent false accusations."],
    ans: "C",
    exp: "Security and fairness: Report observable evidence without making unsupported accusations."
  },
  {
    num: 111,
    text: "A user asks you to bypass endpoint protection because it slows down a required application. What is the best response?",
    options: ["Assess the application issue and use the authorized security-exception process if justified; do not unilaterally disable protection.", "Disable protection permanently.", "Tell every employee to disable antivirus.", "Install an unapproved replacement from an unknown source."],
    ans: "A",
    exp: "Security judgment: Investigate the compatibility problem and use authorized exceptions rather than unilaterally removing protection."
  },
  {
    num: 112,
    text: "You receive a maintenance request containing a password in plain text. What is the most appropriate handling?",
    options: ["Forward the password to the whole ICT team.", "Store it in the public service-request description.", "Use the password for unrelated administrative work.", "Avoid reproducing it unnecessarily, protect the ticket, and follow policy for secure credential handling and any required password reset."],
    ans: "D",
    exp: "Credential protection: Minimize exposure and follow secure handling and reset procedures."
  },
  {
    num: 113,
    text: "An employee reports that a suspicious email was opened, but the employee fears disciplinary action and asks you not to report it. What should you do?",
    options: ["Promise to keep the incident secret.", "Encourage prompt reporting, follow incident procedures, and handle the employee respectfully without concealing the security event.", "Delete the email and all related evidence.", "Wait until other employees are affected."],
    ans: "B",
    exp: "Incident reporting: Prompt reporting protects the institution; the employee should be treated professionally."
  },
  {
    num: 114,
    text: "A colleague wants to install an unlicensed software package because it has useful features. What is the best response?",
    options: ["Install it because the institution will benefit.", "Copy it to all office computers.", "Explain the licensing and security risks and seek an approved, properly licensed alternative.", "Disable software inventory controls."],
    ans: "C",
    exp: "Licensing and security: Seek approved, properly licensed software."
  },
  {
    num: 115,
    text: "A nontechnical employee is frustrated because their computer has failed before an important public-service deadline. What is the best response?",
    options: ["Listen, acknowledge the operational impact, explain the next steps in understandable language, and provide realistic updates.", "Tell the employee that technical problems are not your concern.", "Use complex technical terms to end the conversation quickly.", "Promise a repair time you cannot reasonably guarantee."],
    ans: "A",
    exp: "Public-service communication: Acknowledge impact, explain clearly, and provide realistic updates."
  },
  {
    num: 116,
    text: "Two departments submit urgent maintenance requests at the same time. One affects a shared system used for public services; the other affects one employee's noncritical application. What is the best approach?",
    options: ["Handle whichever request came from the more senior employee.", "Ignore both until the following day.", "Work on the easiest issue regardless of impact.", "Assess urgency and service impact, prioritize the shared critical service, communicate the plan, and arrange the next response for the other request."],
    ans: "D",
    exp: "Prioritization: Service impact and urgency should determine the sequence, not seniority or convenience."
  },
  {
    num: 117,
    text: "A coworker disagrees with your diagnosis of a recurring printer problem. What should you do?",
    options: ["Insist that your view is correct because you are the assigned technician.", "Compare the evidence, test the competing explanations where practical, and agree on a documented troubleshooting plan.", "Stop working on the printer without informing anyone.", "Complain about the coworker to users."],
    ans: "B",
    exp: "Teamwork and critical thinking: Evidence and controlled tests are better than personal insistence."
  },
  {
    num: 118,
    text: "A user submits a complaint that your technical explanation was unclear. What is the best response?",
    options: ["Tell the user to learn more about computers.", "Close the complaint without reading it.", "Clarify the explanation in plain language, check the user's understanding, and use the feedback to improve support.", "Remove the complaint from the system."],
    ans: "C",
    exp: "Customer service: Respond constructively and make the technical explanation understandable."
  },
  {
    num: 119,
    text: "A newly hired colleague is unfamiliar with the institution's maintenance-record procedure. What is the most appropriate action?",
    options: ["Explain the procedure, demonstrate a properly completed record, and direct the colleague to the approved documentation.", "Let the colleague make repeated errors to learn independently.", "Complete all of the colleague's work indefinitely without explanation.", "Share confidential records as examples without authorization."],
    ans: "A",
    exp: "Cooperation and knowledge sharing: Training and approved documentation improve consistent performance."
  },
  {
    num: 120,
    text: "You are assigned a task outside your current technical knowledge, and the issue affects a public-facing service. What should you do?",
    options: ["Pretend you have the required expertise.", "Experiment directly on the production system without approval.", "Reject all responsibility without examining the issue.", "Assess the risk, perform only safe authorized checks within your competence, seek guidance or escalation, and keep the relevant people informed."],
    ans: "D",
    exp: "Professional judgment: Work within competence, avoid unsafe experimentation, and escalate appropriately."
  },
  {
    num: 121,
    text: "You have three tasks: a suspected malware incident on a shared workstation, a routine keyboard replacement, and a preventive-maintenance appointment. What is the best prioritization?",
    options: ["Replace the keyboard first because it is easiest.", "Follow incident procedures for the suspected malware, assess containment needs, and schedule the other tasks according to risk and service impact.", "Ignore the suspected malware until the next scheduled maintenance.", "Complete tasks in alphabetical order by employee name."],
    ans: "B",
    exp: "Security prioritization: A suspected compromise requires prompt assessment and containment under procedure."
  },
  {
    num: 122,
    text: "Your supervisor asks for a maintenance report before the end of the day, but two devices are still awaiting parts. What should you do?",
    options: ["Report both devices as repaired.", "Omit the devices from the report.", "Submit an accurate report identifying completed work, unresolved faults, dependencies, and expected next actions.", "Change the dates to make the work appear completed earlier."],
    ans: "C",
    exp: "Honest reporting: Distinguish completed work from unresolved faults and dependencies."
  },
  {
    num: 123,
    text: "A critical workstation fails shortly before a public-service deadline. A temporary workaround may restore service, but a permanent repair will take longer. What is the best decision process?",
    options: ["Assess the safety and security of the workaround, obtain required approval, restore essential service where feasible, communicate limitations, and schedule the permanent fix.", "Use any workaround without considering security.", "Delay all action until the deadline passes.", "Hide the failure from the department."],
    ans: "A",
    exp: "Risk-based decision-making: Restore essential service safely while communicating limitations and arranging permanent repair."
  },
  {
    num: 124,
    text: "You have insufficient spare parts to complete all current repairs. What is the best response?",
    options: ["Use incompatible parts to close all requests.", "Give the available parts to friends first.", "Report every device as unrepairable.", "Prioritize by service impact and risk, verify compatibility, document shortages, and request replenishment through the proper process."],
    ans: "D",
    exp: "Resource management: Prioritize transparently and document shortages rather than using incompatible parts."
  },
  {
    num: 125,
    text: "A manager pressures you to close a service request before the problem is verified because the monthly performance report is due. What should you do?",
    options: ["Close the request and assume the computer will work.", "Explain that closure requires an accurate service status, record the current condition, and agree on a legitimate reporting approach.", "Delete the request.", "Ask the user to confirm a repair that has not occurred."],
    ans: "B",
    exp: "Accountability: Reports must reflect actual service status, not desired performance figures."
  },
  {
    num: 126,
    text: "A new approved software update changes how users print documents. Several users request assistance. What is the best response?",
    options: ["Tell users to figure it out themselves.", "Uninstall the update on every computer without assessment.", "Learn the changed workflow, provide clear instructions, identify recurring issues, and escalate confirmed defects through the appropriate process.", "Disable all future software updates."],
    ans: "C",
    exp: "Adaptability: Learn the changed workflow, support users, and escalate confirmed defects."
  },
  {
    num: 127,
    text: "You receive constructive feedback that your maintenance reports lack sufficient diagnostic detail. What should you do?",
    options: ["Review the feedback, improve the records to include symptoms, tests, actions, results, and escalation details, and apply the change consistently.", "Argue that documentation is unnecessary.", "Stop submitting reports.", "Copy another technician's reports regardless of accuracy."],
    ans: "A",
    exp: "Learning and improvement: Use feedback to make maintenance records more complete and useful."
  },
  {
    num: 128,
    text: "You discover that a troubleshooting method you routinely use is outdated and conflicts with current approved procedures. What is the best response?",
    options: ["Continue using it because it is familiar.", "Teach it to all new employees before anyone notices.", "Ignore the new procedure.", "Review the approved guidance, update your practice, seek clarification where needed, and share verified improvements with the team."],
    ans: "D",
    exp: "Continuous improvement: Adopt current approved procedures and verify any proposed improvements."
  },
  {
    num: 129,
    text: "After completing a repair, you discover that your change caused another function to fail. What is the best action?",
    options: ["Hide the secondary fault because the original problem was fixed.", "Inform the appropriate people, assess impact, restore a safe state where possible, correct or escalate the change, and document the outcome.", "Blame the user for using the computer.", "Delete the original service request."],
    ans: "B",
    exp: "Ownership: Disclose the impact, restore a safe state, and document corrective action."
  },
  {
    num: 130,
    text: "An employee complains that another employee's computer was repaired first. You prioritized the first request because it affected a critical shared service. What is the best response?",
    options: ["Reveal confidential details about the other employee's problem.", "Say that the complaining employee is unimportant.", "Explain the general service-prioritization criteria, protect confidential details, and provide a realistic update on the pending request.", "Change the repair record to make the requests appear simultaneous."],
    ans: "C",
    exp: "Fairness and communication: Explain general criteria without disclosing another user's confidential details."
  }
];

console.log(`Loaded ${rawQuestionsAndOptions.length} questions for EXAM 22.`);
if (rawQuestionsAndOptions.length !== 130) {
  console.error(`Expected 130 questions, got ${rawQuestionsAndOptions.length}`);
  process.exit(1);
}

const letterToIndex = { A: 0, B: 1, C: 2, D: 3 };

// Validate every question
for (const q of rawQuestionsAndOptions) {
  if (!q.text || q.text.trim().length === 0) throw new Error(`Q${q.num} empty text`);
  if (!q.options || q.options.length !== 4) throw new Error(`Q${q.num} does not have 4 options`);
  if (letterToIndex[q.ans] === undefined) throw new Error(`Q${q.num} invalid answer ${q.ans}`);
}
console.log('All 130 questions validated successfully!');

async function seedExam22() {
  const now = new Date().toISOString();
  const categoryId = 'ad842eb6-4202-4a57-ae73-007ede7ea79f'; // Category
  const authorId = 'e6a0cc7f-1d9c-45ed-8139-457031b71f3c';   // admin

  const subjectId = crypto.randomUUID();
  const subjectSlug = 'exam-22-hardware-and-computer-architecture';
  const subjectName = 'EXAM 22 Hardware and computer architecture';

  const examTemplateId = crypto.randomUUID();
  const examSlug = 'exam-22-hardware-and-computer-architecture';
  const examName = 'EXAM 22 Hardware and computer architecture';
  const examDesc = '130 comprehensive questions covering Hardware & Computer Architecture, Operating Systems & Software, Networking & Connectivity, Printers & Peripherals, Data Protection, Troubleshooting Procedures, Advanced Technical Scenarios, Ethics & Integrity, Security, Public Service Communication, and Prioritization.';

  // 1. Insert into SQLite
  const sqliteDb = new DatabaseSync(path.resolve(__dirname, '../prisma/exam.db'));

  // Subject
  const existingSub = sqliteDb.prepare('SELECT id FROM Subject WHERE slug = ?').get(subjectSlug);
  let effectiveSubjectId = subjectId;
  if (existingSub) {
    effectiveSubjectId = existingSub.id;
    console.log(`Subject ${subjectSlug} already exists in SQLite with id ${effectiveSubjectId}`);
  } else {
    sqliteDb.prepare(`
      INSERT INTO Subject (id, slug, name, categoryId, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(subjectId, subjectSlug, subjectName, categoryId, now, now);
    console.log(`Created Subject ${subjectSlug} in SQLite`);
  }

  // ExamTemplate
  const existingExam = sqliteDb.prepare('SELECT id FROM ExamTemplate WHERE slug = ?').get(examSlug);
  let effectiveExamId = examTemplateId;
  if (existingExam) {
    effectiveExamId = existingExam.id;
    console.log(`ExamTemplate ${examSlug} already exists in SQLite with id ${effectiveExamId}`);
  } else {
    sqliteDb.prepare(`
      INSERT INTO ExamTemplate (
        id, slug, name, categoryId, subjectId, topicWeights, totalQuestions, durationMinutes,
        marksPerQuestion, negativeMarking, difficultyDistribution, randomizeQuestions,
        randomizeOptions, avoidPreviouslySeen, allowReuse, autoSubmitOnExpiry,
        passThresholdPercent, description, isPublic, publishedAt, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, NULL, 130, 150,
        1, 0, NULL, 1,
        1, 0, 0, 1,
        70, ?, 1, ?, ?, ?
      )
    `).run(examTemplateId, examSlug, examName, categoryId, effectiveSubjectId, examDesc, now, now, now);
    console.log(`Created ExamTemplate ${examSlug} in SQLite`);
  }

  // Clear existing questions for this subject in SQLite
  sqliteDb.prepare('DELETE FROM Question WHERE subjectId = ?').run(effectiveSubjectId);

  // Insert Questions
  const insertQStmt = sqliteDb.prepare(`
    INSERT INTO Question (
      id, questionId, questionText, categoryId, subjectId, topicId, difficulty, questionType,
      options, correctOptionIndices, explanation, marks, negativeMarks, tags,
      learningObjectives, source, authorId, status, publishedAt, archivedAt,
      importId, canonicalIndices, createdAt, updatedAt
    ) VALUES (
      ?, ?, ?, ?, ?, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
      ?, ?, ?, 1, NULL, '["hardware","architecture","networking","troubleshooting","ethics"]',
      NULL, 'EXAM 22 Hardware and computer architecture', ?, 'PUBLISHED', ?, NULL,
      NULL, '[0,1,2,3]', ?, ?
    )
  `);

  const questionsToInsert = [];
  for (const q of rawQuestionsAndOptions) {
    const qId = crypto.randomUUID();
    const optJson = JSON.stringify(q.options);
    const correctIdx = letterToIndex[q.ans];
    const ansJson = JSON.stringify([correctIdx]);
    insertQStmt.run(qId, qId, q.text, categoryId, effectiveSubjectId, optJson, ansJson, q.exp, authorId, now, now, now);
    questionsToInsert.push({
      id: qId,
      questionId: qId,
      text: q.text,
      options: optJson,
      correct: ansJson,
      explanation: q.exp
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
          $1, $2, $3, $4, $5, NULL, 130, 150,
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
          $1, $2, $3, $4, $5, NULL, 'INTERMEDIATE', 'SINGLE_CHOICE',
          $6, $7, $8, 1, NULL, '["hardware","architecture","networking","troubleshooting","ethics"]',
          NULL, 'EXAM 22 Hardware and computer architecture', $9, 'PUBLISHED', $10, NULL,
          NULL, '[0,1,2,3]', $11, $12
        )
      `, [q.id, q.questionId, q.text, categoryId, pgSubjectId, q.options, q.correct, q.explanation, authorId, now, now, now]);
    }
    console.log(`Inserted ${questionsToInsert.length} questions into Supabase PostgreSQL successfully.`);
  } finally {
    await pool.end();
  }
}

seedExam22().catch((err) => {
  console.error('Error during seeding:', err);
  process.exit(1);
});
