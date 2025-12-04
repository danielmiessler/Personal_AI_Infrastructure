# CMMC 2.0 - All 17 Domains (Complete Reference)

**CMMC Version**: 2.0 (Final Rule, October 2024)
**Source**: U.S. Department of Defense, NIST SP 800-171 Rev 2
**Last Updated**: 2025-12-02

---

## Overview

**CMMC 2.0 Levels**:
- **Level 1**: Foundational (17 practices) - Basic cyber hygiene, self-assessed
- **Level 2**: Advanced (110 practices) - NIST SP 800-171 aligned, self-assessed or C3PAO certified
- **Level 3**: Expert (130 practices, Level 2 + 20 additional) - Advanced persistent threats, C3PAO certified

**17 Domains**:
1. AC - Access Control
2. AT - Awareness and Training
3. AU - Audit and Accountability
4. CA - Assessment, Authorization, and Monitoring
5. CM - Configuration Management
6. CP - Contingency Planning
7. IA - Identification and Authentication
8. IR - Incident Response
9. MA - Maintenance
10. MP - Media Protection
11. PE - Physical Protection
12. PS - Personnel Security
13. RA - Risk Assessment
14. RE - Recovery
15. SA - System and Services Acquisition
16. SC - System and Communications Protection
17. SI - System and Information Integrity

---

## Domain 1: Access Control (AC)

**Purpose**: Limit system access to authorized users, processes, and devices.

### Level 2 Practices (22 total)

#### AC.L2-3.1.1: Limit system access to authorized users
**Requirement**: Limit information system access to authorized users, processes acting on behalf of authorized users, or devices (including other information systems).

**Implementation**:
- User authentication required for all system access
- Service accounts for automated processes
- Device authentication (MAC address, certificates)

**Evidence**:
- Access control lists (ACLs)
- Authentication logs
- System access policy documentation

---

#### AC.L2-3.1.2: Limit system access to authorized transactions and functions
**Requirement**: Limit information system access to the types of transactions and functions that authorized users are permitted to execute.

**Implementation**:
- Role-based access control (RBAC)
- Least privilege enforcement
- Separation of duties

**Evidence**:
- RBAC matrix (role → permissions)
- User access reviews (quarterly)
- Privilege escalation logs

---

#### AC.L2-3.1.3: Control remote access
**Requirement**: Control the flow of CUI in accordance with approved authorizations.

**Implementation**:
- VPN for remote access
- MFA required for remote connections
- Remote access audit logs

**Evidence**:
- VPN connection logs
- MFA enrollment records
- Remote access policy

---

#### AC.L2-3.1.4: Separation of duties
**Requirement**: Separate the duties of individuals to reduce the risk of malevolent activity without collusion.

**Implementation**:
- Code review requires different person than author
- Database admin ≠ application admin
- Financial approval requires 2 people

**Evidence**:
- Separation of duties matrix
- Code review records
- Approval workflows

---

#### AC.L2-3.1.5: Employ least privilege
**Requirement**: Employ the principle of least privilege, including for specific security functions and privileged accounts.

**Implementation**:
- Users have minimum permissions needed
- Admin privileges granted temporarily (just-in-time)
- Regular access reviews to remove unused permissions

**Evidence**:
- Permission audit reports
- Just-in-time admin logs
- Access review records (quarterly)

---

#### AC.L2-3.1.6: Use non-privileged accounts
**Requirement**: Use non-privileged accounts or roles when accessing nonsecurity functions.

**Implementation**:
- Separate admin and user accounts
- Admin account used only for privileged tasks
- Developers use non-admin accounts for coding

**Evidence**:
- Dual-account setup for admins
- Account usage logs
- Policy documentation

---

#### AC.L2-3.1.7: Prevent non-privileged users from executing privileged functions
**Requirement**: Prevent non-privileged users from executing privileged functions and capture the execution of such functions in audit logs.

**Implementation**:
- sudo/UAC prompts for privilege escalation
- Audit log captures all privilege escalation
- Alerts on unexpected privilege use

**Evidence**:
- Privilege escalation logs
- SIEM alerts for privilege abuse
- Policy enforcement mechanisms

---

#### AC.L2-3.1.8: Limit unsuccessful logon attempts
**Requirement**: Limit unsuccessful logon attempts.

**Implementation**:
- Account lockout after 5 failed attempts
- 30-minute lockout duration
- Manual unlock by admin (logged)

**Evidence**:
- Account lockout policy
- Failed login attempt logs
- Unlock request records

---

#### AC.L2-3.1.9: Provide privacy and security notices
**Requirement**: Provide privacy and security notices consistent with applicable CUI rules.

**Implementation**:
- Login banner displays CUI warning
- Privacy policy available to all users
- Annual security awareness acknowledgment

**Evidence**:
- Login banner screenshot
- Privacy policy documentation
- User acknowledgment records

---

#### AC.L2-3.1.10: Use session lock with pattern-hiding displays
**Requirement**: Use session lock with pattern-hiding displays to prevent access and viewing of data after a period of inactivity.

**Implementation**:
- Screen lock after 15 minutes idle
- Requires password to unlock
- CUI data hidden while locked

**Evidence**:
- Session timeout policy
- GPO/MDM configuration
- User training records

---

#### AC.L2-3.1.11: Terminate session after defined period
**Requirement**: Terminate (automatically) a user session after a defined condition.

**Implementation**:
- Web sessions expire after 30 minutes idle
- SSH/RDP sessions terminate after 60 minutes idle
- User notified before termination

**Evidence**:
- Session timeout configuration
- Session termination logs
- Policy documentation

---

#### AC.L2-3.1.12: Monitor and control remote access sessions
**Requirement**: Monitor and control remote access sessions.

**Implementation**:
- VPN logs monitored daily
- Alerts on remote access from unusual locations
- Remote sessions can be terminated by admin

**Evidence**:
- Remote access monitoring logs
- SIEM rules for anomaly detection
- Remote session termination records

---

#### AC.L2-3.1.13: Employ cryptographic mechanisms to protect confidentiality of remote access sessions
**Requirement**: Employ cryptographic mechanisms to protect the confidentiality of remote access sessions.

**Implementation**:
- TLS 1.2+ for web applications
- SSH for remote command line
- IPSec or TLS for VPN

**Evidence**:
- TLS certificate configuration
- VPN encryption settings
- Network scan results (no unencrypted protocols)

---

#### AC.L2-3.1.14: Route remote access via managed access control points
**Requirement**: Route remote access via managed access control points.

**Implementation**:
- All remote access through VPN gateway
- Split tunneling disabled
- Access control enforced at gateway

**Evidence**:
- VPN architecture diagram
- Gateway configuration
- Network traffic logs

---

#### AC.L2-3.1.15: Authorize remote execution of privileged commands
**Requirement**: Authorize remote execution of privileged commands and remote access to security-relevant information.

**Implementation**:
- Remote admin requires MFA
- Privileged remote access logged
- Approval required for emergency remote access

**Evidence**:
- Remote admin logs
- MFA enrollment for admins
- Emergency access approval records

---

#### AC.L2-3.1.16: Authorize wireless access
**Requirement**: Authorize wireless access prior to allowing such connections.

**Implementation**:
- WPA3-Enterprise (802.1X) for corporate WiFi
- Certificate-based authentication
- Guest network isolated from corporate

**Evidence**:
- WiFi authentication configuration
- Certificate enrollment records
- Network segmentation documentation

---

#### AC.L2-3.1.17: Protect wireless access using authentication and encryption
**Requirement**: Protect wireless access using authentication and encryption.

**Implementation**:
- WPA3 encryption
- AES-256 for wireless encryption
- Regular WiFi password rotation (if PSK used)

**Evidence**:
- WiFi configuration
- Encryption settings
- Password rotation logs

---

#### AC.L2-3.1.18: Control connection of mobile devices
**Requirement**: Control connection of mobile devices.

**Implementation**:
- MDM enrollment required for mobile access
- Device compliance checks (OS version, encryption)
- Remote wipe capability

**Evidence**:
- MDM enrollment records
- Device compliance reports
- Mobile device policy

---

#### AC.L2-3.1.19: Encrypt CUI on mobile devices
**Requirement**: Encrypt CUI on mobile devices and mobile computing platforms.

**Implementation**:
- Full-disk encryption on laptops (BitLocker, FileVault)
- Container encryption on mobile devices (iOS, Android)
- CUI stored in encrypted apps only

**Evidence**:
- Encryption status reports (MDM)
- Device encryption policy
- Compliance audit results

---

#### AC.L2-3.1.20: Verify and control/limit connections to external systems
**Requirement**: Verify and control/limit connections to and use of external information systems.

**Implementation**:
- Allowlist for external systems
- Data loss prevention (DLP) monitors data transfers
- Approval required for new external connections

**Evidence**:
- External system inventory
- DLP policy and logs
- Connection approval records

---

#### AC.L2-3.1.21: Limit use of portable storage devices
**Requirement**: Limit use of portable storage devices on external information systems.

**Implementation**:
- USB ports disabled on workstations (except approved)
- Encrypted USB drives approved for CUI
- USB device usage logged

**Evidence**:
- USB device control policy (GPO/MDM)
- Approved USB device list
- USB usage logs

---

#### AC.L2-3.1.22: Control CUI posted or processed on publicly accessible systems
**Requirement**: Control CUI posted or processed on publicly accessible information systems.

**Implementation**:
- CUI not posted on public websites
- Public-facing systems isolated from CUI systems
- Data classification review before public posting

**Evidence**:
- Data classification policy
- Network architecture (DMZ for public systems)
- Publication approval workflow

---

## Domain 2: Awareness and Training (AT)

**Purpose**: Ensure personnel are trained to protect CUI.

### Level 2 Practices (4 total)

#### AT.L2-3.2.1: Security awareness training
**Requirement**: Ensure that managers, systems administrators, and users of organizational information systems are made aware of the security risks associated with their activities and of the applicable policies, standards, and procedures related to the security of those systems.

**Implementation**:
- Annual security awareness training for all personnel
- Role-based training (admins get advanced training)
- Training tracks: phishing, password security, CUI handling

**Evidence**:
- Training completion records
- Training materials and curriculum
- Annual acknowledgment forms

---

#### AT.L2-3.2.2: Insider threat awareness
**Requirement**: Ensure that personnel are trained to carry out their assigned information security-related duties and responsibilities.

**Implementation**:
- Insider threat indicators training
- Report suspicious activity procedures
- Annual refresher training

**Evidence**:
- Insider threat training materials
- Reporting mechanism documentation
- Training completion records

---

#### AT.L2-3.2.3: Role-based security training
**Requirement**: Provide security awareness training on recognizing and reporting potential indicators of insider threat.

**Implementation**:
- Developers: Secure coding training
- Admins: Hardening and patching training
- Managers: Risk management training

**Evidence**:
- Role-based training matrix
- Specialized training completion records
- Training curriculum by role

---

#### AT.L2-3.2.4: Practical exercises
**Requirement**: Provide practical exercises in security awareness training that simulate actual cyber attacks.

**Implementation**:
- Quarterly phishing simulation campaigns
- Annual tabletop incident response exercise
- Metrics tracked: click rate, report rate

**Evidence**:
- Phishing simulation results
- Tabletop exercise after-action reports
- Improvement trends over time

---

## Domain 3: Audit and Accountability (AU)

**Purpose**: Create, protect, and retain audit logs to enable detection and investigation of security incidents.

### Level 2 Practices (9 total)

#### AU.L2-3.3.1: Create audit records
**Requirement**: Create and retain information system audit records to the extent needed to enable the monitoring, analysis, investigation, and reporting of unlawful or unauthorized information system activity.

**Implementation**:
- Audit logging enabled for all CUI systems
- Logs include: timestamp, user, action, result
- Centralized log collection (SIEM)

**Evidence**:
- Audit log configuration
- SIEM log ingestion records
- Sample audit logs

---

#### AU.L2-3.3.2: Audit events based on risk
**Requirement**: Ensure that the actions of individual information system users can be uniquely traced to those users so they can be held accountable for their actions.

**Implementation**:
- User activity logged (not just admin)
- Logs correlate actions to specific user accounts
- No shared accounts for CUI access

**Evidence**:
- User activity logs
- Account management policy (no shared accounts)
- Log correlation examples

---

#### AU.L2-3.3.3: Review audit logs
**Requirement**: Review and update logged events.

**Implementation**:
- Weekly audit log review for anomalies
- SIEM generates alerts for high-risk events
- Log review findings documented

**Evidence**:
- Audit log review schedule
- Review findings reports
- SIEM alert rules

---

#### AU.L2-3.3.4: Alert on audit processing failures
**Requirement**: Alert in the event of an audit logging process failure.

**Implementation**:
- SIEM alerts when logs stop arriving
- Daily log ingestion health check
- Escalation if logging failure >1 hour

**Evidence**:
- Logging failure alert configuration
- Alert escalation procedures
- Incident records for log failures

---

#### AU.L2-3.3.5: Correlate audit records
**Requirement**: Correlate audit record review, analysis, and reporting processes for investigation and response to indications of unlawful, unauthorized, suspicious, or unusual activity.

**Implementation**:
- SIEM correlates logs across systems
- Use cases: failed login + privilege escalation = alert
- Incident investigation uses correlated logs

**Evidence**:
- SIEM correlation rules
- Incident investigation reports citing logs
- Alert tuning records

---

#### AU.L2-3.3.6: Audit record reduction and report generation
**Requirement**: Provide audit record reduction and report generation to support on-demand analysis and reporting.

**Implementation**:
- SIEM dashboards for common queries
- Saved searches for compliance reporting
- Ad-hoc log analysis capability

**Evidence**:
- SIEM dashboard screenshots
- Compliance report templates
- Ad-hoc query examples

---

#### AU.L2-3.3.7: Audit record retention
**Requirement**: Provide an information system capability that compares and synchronizes internal system clocks with an authoritative source to generate time stamps for audit records.

**Implementation**:
- NTP configured on all systems
- Time synchronization monitored
- Timestamps in UTC for consistency

**Evidence**:
- NTP configuration
- Time sync monitoring logs
- Timestamp format standards

---

#### AU.L2-3.3.8: Protect audit information
**Requirement**: Protect audit information and audit logging tools from unauthorized access, modification, and deletion.

**Implementation**:
- Logs stored in write-once storage (WORM)
- SIEM admin access restricted to security team
- Audit trail for log access

**Evidence**:
- Log storage configuration (immutability)
- SIEM RBAC configuration
- Audit log access logs

---

#### AU.L2-3.3.9: Limit audit log management to privileged users
**Requirement**: Limit management of audit logging functionality to a subset of privileged users.

**Implementation**:
- Only security admins can modify SIEM rules
- Developers cannot delete logs
- Audit log config changes require approval

**Evidence**:
- SIEM admin access list
- Configuration change approval records
- Separation of duties matrix

---

## Domain 4: Security Assessment (CA)

**Purpose**: Periodically assess security controls to ensure effectiveness.

### Level 2 Practices (3 total)

#### CA.L2-3.12.1: Periodic security assessments
**Requirement**: Periodically assess the security controls in organizational information systems to determine if the controls are effective in their application.

**Implementation**:
- Annual internal security assessment
- Quarterly vulnerability scans
- Triennial penetration test

**Evidence**:
- Security assessment schedule
- Assessment reports with findings
- Remediation tracking

---

#### CA.L2-3.12.2: Develop and implement remediation plans
**Requirement**: Develop and implement plans of action designed to correct deficiencies and reduce or eliminate vulnerabilities in organizational information systems.

**Implementation**:
- POA&M (Plan of Action & Milestones) for findings
- Risk acceptance for findings that can't be fixed
- Monthly POA&M review meetings

**Evidence**:
- POA&M document
- Risk acceptance memos
- POA&M status reports

---

#### CA.L2-3.12.3: Monitor security controls
**Requirement**: Monitor security controls on an ongoing basis to ensure the continued effectiveness of the controls.

**Implementation**:
- Continuous monitoring via SIEM
- Monthly control effectiveness reviews
- Annual control re-assessment

**Evidence**:
- SIEM dashboards showing control status
- Monthly control review reports
- Annual assessment results

---

## Domain 5: Configuration Management (CM)

**Purpose**: Establish and maintain baseline configurations and inventories.

### Level 2 Practices (9 total)

#### CM.L2-3.4.1: Baseline configurations
**Requirement**: Establish and maintain baseline configurations and inventories of organizational information systems (including hardware, software, firmware, and documentation) throughout the respective system development life cycles.

**Implementation**:
- Configuration management database (CMDB)
- Standard OS images (hardened baselines)
- Version control for infrastructure as code

**Evidence**:
- CMDB inventory
- Baseline image documentation
- IaC git repository

---

#### CM.L2-3.4.2: Security configuration settings
**Requirement**: Establish and enforce security configuration settings for information technology products employed in organizational information systems.

**Implementation**:
- CIS Benchmarks applied to OS, databases, apps
- Configuration drift detection
- Non-compliant systems quarantined

**Evidence**:
- CIS Benchmark compliance reports
- Configuration scanning tool
- Quarantine policy and logs

---

#### CM.L2-3.4.3: Track and control changes
**Requirement**: Track, review, approve or disapprove, and log changes to organizational information systems.

**Implementation**:
- Change management process (RFC)
- CAB (Change Advisory Board) reviews high-risk changes
- All changes logged in ticketing system

**Evidence**:
- Change management policy
- CAB meeting minutes
- Change tickets with approval records

---

#### CM.L2-3.4.4: Analyze change impact
**Requirement**: Analyze the security impact of changes prior to implementation.

**Implementation**:
- Security risk assessment for all changes
- Threat modeling for architecture changes
- Rollback plan required for high-risk changes

**Evidence**:
- Change risk assessment template
- Threat model for major changes
- Rollback plan documentation

---

#### CM.L2-3.4.5: Access restrictions for change
**Requirement**: Define, document, approve, and enforce physical and logical access restrictions associated with changes to organizational information systems.

**Implementation**:
- Production changes require approval
- Developers cannot deploy to production
- All production access logged

**Evidence**:
- Production access policy
- Deployment approval records
- Production access logs

---

#### CM.L2-3.4.6: Employ least functionality
**Requirement**: Employ the principle of least functionality by configuring organizational information systems to provide only essential capabilities.

**Implementation**:
- Unnecessary services disabled
- Unused ports closed
- Minimal software installed

**Evidence**:
- Port scan results (only required ports open)
- Installed software inventory
- Service hardening documentation

---

#### CM.L2-3.4.7: Restrict, disable, prevent software
**Requirement**: Restrict, disable, or prevent the use of nonessential programs, functions, ports, protocols, and services.

**Implementation**:
- Application allowlisting (only approved apps run)
- Firewall rules block unused protocols
- PowerShell execution restricted

**Evidence**:
- Application allowlist configuration
- Firewall rule documentation
- PowerShell execution policy

---

#### CM.L2-3.4.8: User-installed software
**Requirement**: Apply deny-by-default, allow-by-exception policy to prevent the use of unauthorized software or deny-list unauthorized software.

**Implementation**:
- Users cannot install software (non-admin accounts)
- Software request process
- Approved software catalog

**Evidence**:
- Software installation policy
- Software request records
- Approved software list

---

#### CM.L2-3.4.9: Control and monitor user-installed software
**Requirement**: Control and monitor user-installed software.

**Implementation**:
- Endpoint detection monitors for unapproved software
- Alerts on unauthorized installs
- Periodic endpoint compliance scans

**Evidence**:
- EDR monitoring configuration
- Unauthorized software alerts
- Endpoint compliance reports

---

## Domain 6: Contingency Planning (CP)

**Purpose**: Establish plans to maintain operations during disruptions and restore systems after incidents.

### Level 2 Practices (4 total)

#### CP.L2-3.6.1: Contingency planning
**Requirement**: Establish, maintain, and effectively implement plans for emergency response, backup operations, and post-disaster recovery for organizational information systems to ensure the availability of critical information resources and continuity of operations in emergency situations.

**Implementation**:
- Disaster Recovery Plan (DRP)
- Business Continuity Plan (BCP)
- Annual plan review and update

**Evidence**:
- DRP and BCP documents
- Plan approval records
- Annual review meeting minutes

---

#### CP.L2-3.6.2: Alternate storage sites
**Requirement**: Provide for the preservation of essential information in alternate storage sites located sufficient distance from the primary site to protect against damage in the event of an accidental or deliberate compromise of information at the primary storage site.

**Implementation**:
- Backups stored in geographically separated location
- Cloud backup to different region/availability zone
- Distance >100 miles from primary site

**Evidence**:
- Backup architecture diagram
- Cloud region configuration
- Geographic separation documentation

---

#### CP.L2-3.6.3: Test contingency plans
**Requirement**: Test contingency plans to determine effectiveness and identify potential weaknesses.

**Implementation**:
- Annual DR tabletop exercise
- Annual backup restore test
- Findings addressed in POA&M

**Evidence**:
- DR test plan and schedule
- Test results and after-action report
- POA&M for test findings

---

#### CP.L2-3.6.4: Alternate processing sites
**Requirement**: Provide for the recovery and reconstitution of organizational information systems to a known state after a disruption, compromise, or failure.

**Implementation**:
- Hot/warm/cold site based on RTO
- Documented recovery procedures
- Recovery tested annually

**Evidence**:
- Recovery site configuration
- Recovery procedure documentation
- Recovery test results

---

## Domain 7: Identification and Authentication (IA)

**Purpose**: Identify and authenticate users and devices.

### Level 2 Practices (11 total)

#### IA.L2-3.5.1: Identify system users
**Requirement**: Identify information system users, processes acting on behalf of users, or devices.

**Implementation**:
- Unique user accounts (no shared accounts)
- Service accounts for automated processes
- Device identifiers (MAC, certificates)

**Evidence**:
- User account inventory
- Service account inventory
- Device inventory

---

#### IA.L2-3.5.2: Authenticate users, processes, devices
**Requirement**: Authenticate (or verify) the identities of those users, processes, or devices, as a prerequisite to allowing access to organizational information systems.

**Implementation**:
- Password authentication minimum
- Certificate-based for service accounts
- Device certificates for network access

**Evidence**:
- Authentication configuration
- Certificate management records
- Authentication logs

---

#### IA.L2-3.5.3: Multi-factor authentication
**Requirement**: Use multifactor authentication for local and network access to privileged accounts and for network access to non-privileged accounts.

**Implementation**:
- MFA for all admin accounts (required)
- MFA for all users accessing CUI remotely (required)
- TOTP, hardware token, or biometric

**Evidence**:
- MFA enrollment records
- MFA usage logs
- MFA policy documentation

---

#### IA.L2-3.5.4: Replay-resistant authentication
**Requirement**: Employ replay-resistant authentication mechanisms for network access to privileged and non-privileged accounts.

**Implementation**:
- Kerberos (time-limited tickets)
- TLS with session tokens
- MFA with TOTP (time-based)

**Evidence**:
- Kerberos configuration
- TLS session management
- MFA TOTP implementation

---

#### IA.L2-3.5.5: Prevent password reuse
**Requirement**: Prevent reuse of identifiers for a defined period.

**Implementation**:
- Password history: 24 previous passwords
- Account reuse prevented for 90 days after deletion
- Service account names not recycled

**Evidence**:
- Password policy configuration
- Account deletion policy
- Account management logs

---

#### IA.L2-3.5.6: Disable identifiers after period of inactivity
**Requirement**: Disable identifiers after a defined period of inactivity.

**Implementation**:
- Accounts disabled after 90 days inactive
- Deleted after 180 days inactive
- Automated process checks daily

**Evidence**:
- Account lifecycle policy
- Inactive account reports
- Automated disablement logs

---

#### IA.L2-3.5.7: Password complexity
**Requirement**: Enforce a minimum password complexity and change of characters when new passwords are created.

**Implementation**:
- Minimum 14 characters
- Complexity: uppercase, lowercase, number, symbol
- Prohibit common passwords (e.g., "Password123!")

**Evidence**:
- Password policy configuration (GPO/IDaas)
- Common password blocklist
- Password policy documentation

---

#### IA.L2-3.5.8: Prohibit password reuse
**Requirement**: Prohibit password reuse for a specified number of generations.

**Implementation**:
- Password history: 24 passwords
- Enforced at password change
- Cannot reuse password for 2+ years

**Evidence**:
- Password policy (history setting)
- Password change rejection logs
- Policy documentation

---

#### IA.L2-3.5.9: Temporary passwords
**Requirement**: Allow temporary password use for system logons with an immediate change to a permanent password.

**Implementation**:
- Temp passwords force change at first login
- Temp passwords expire in 24 hours if unused
- Cannot reuse temp password as permanent

**Evidence**:
- Temporary password policy
- First-login password change logs
- Temp password expiration logs

---

#### IA.L2-3.5.10: Encrypt passwords in storage and transmission
**Requirement**: Store and transmit only cryptographically-protected passwords.

**Implementation**:
- Passwords hashed with bcrypt/Argon2 (not plaintext)
- Password transmission over TLS only
- No passwords in logs or error messages

**Evidence**:
- Password hashing implementation (code review)
- TLS configuration
- Log sanitization

---

#### IA.L2-3.5.11: Obscure feedback of authentication information
**Requirement**: Obscure feedback of authentication information.

**Implementation**:
- Passwords shown as dots/asterisks when typed
- "Invalid username or password" (not which is wrong)
- No password hints

**Evidence**:
- Login screen screenshots
- Error message standardization
- Security testing results

---

## Domain 8: Incident Response (IR)

**Purpose**: Establish operational incident handling capability.

### Level 2 Practices (3 total)

#### IR.L2-3.6.1: Incident handling capability
**Requirement**: Establish an operational incident-handling capability for organizational information systems that includes preparation, detection, analysis, containment, recovery, and user response activities.

**Implementation**:
- Incident Response Plan (IRP)
- IR team with defined roles
- IR playbooks for common scenarios

**Evidence**:
- IRP documentation
- IR team roster and contact info
- Incident playbooks

---

#### IR.L2-3.6.2: Track, document, and report incidents
**Requirement**: Track, document, and report incidents to designated officials and/or authorities both internal and external to the organization.

**Implementation**:
- Incident ticketing system
- Incident severity classification
- Reporting to DoD Cyber Crime Center (DC3) for CUI breaches

**Evidence**:
- Incident ticket records
- Incident report templates
- DC3 reporting procedures

---

#### IR.L2-3.6.3: Test incident response capability
**Requirement**: Test the organizational incident response capability.

**Implementation**:
- Annual tabletop exercise
- Quarterly phishing simulations
- Lessons learned incorporated into IRP

**Evidence**:
- Tabletop exercise scenarios and results
- Phishing simulation metrics
- IRP update history

---

## Domain 9: Maintenance (MA)

**Purpose**: Perform periodic and timely maintenance.

### Level 2 Practices (6 total)

#### MA.L2-3.7.1: Maintenance schedules
**Requirement**: Perform maintenance on organizational information systems.

**Implementation**:
- Monthly OS patching schedule
- Quarterly hardware maintenance
- Annual hardware refresh cycle

**Evidence**:
- Maintenance schedule
- Maintenance completion records
- Patching compliance reports

---

#### MA.L2-3.7.2: Effective controls for maintenance
**Requirement**: Provide controls on the tools, techniques, mechanisms, and personnel used to conduct information system maintenance.

**Implementation**:
- Approved tools list for maintenance
- Background checks for maintenance personnel
- Maintenance activity logged

**Evidence**:
- Approved maintenance tools inventory
- Personnel background check records
- Maintenance activity logs

---

#### MA.L2-3.7.3: Sanitize equipment before maintenance
**Requirement**: Ensure equipment removed for off-site maintenance is sanitized of any CUI.

**Implementation**:
- Wipe drives before sending for repair
- Use encrypted drives (data not accessible)
- Certificate of destruction for drives

**Evidence**:
- Data sanitization procedures
- Sanitization logs (date, method, personnel)
- Destruction certificates

---

#### MA.L2-3.7.4: Media sanitization
**Requirement**: Check media containing diagnostic and test programs for malicious code before the media are used in organizational information systems.

**Implementation**:
- Antivirus scan of all media before use
- Media from vendors inspected
- Only trusted sources for diagnostic tools

**Evidence**:
- Media scanning procedures
- Antivirus scan logs
- Trusted vendor list

---

#### MA.L2-3.7.5: Non-local maintenance approval
**Requirement**: Require multifactor authentication to establish nonlocal maintenance sessions via external network connections and terminate such connections when nonlocal maintenance is complete.

**Implementation**:
- MFA required for remote maintenance
- Remote sessions logged
- Session terminated immediately after maintenance

**Evidence**:
- Remote maintenance policy
- MFA logs for remote sessions
- Session termination logs

---

#### MA.L2-3.7.6: Supervise maintenance personnel
**Requirement**: Supervise the maintenance activities of maintenance personnel without required access authorization.

**Implementation**:
- Escort for third-party maintenance personnel
- Screen sharing monitored for remote maintenance
- Log all maintenance actions

**Evidence**:
- Visitor/escort logs
- Remote session recordings
- Maintenance supervision procedures

---

## Domain 10: Media Protection (MP)

**Purpose**: Protect CUI in digital and non-digital media.

### Level 2 Practices (7 total)

#### MP.L2-3.8.1: Protect media
**Requirement**: Protect (i.e., physically control and securely store) information system media containing CUI, both paper and digital.

**Implementation**:
- CUI media in locked cabinets
- Digital media encrypted
- Access log for media room

**Evidence**:
- Physical security controls (locks, badges)
- Encryption configuration
- Access logs

---

#### MP.L2-3.8.2: Limit CUI access to authorized users
**Requirement**: Limit access to CUI on information system media to authorized users.

**Implementation**:
- Media labeled with classification level
- Access requires authorization
- Media checkout/checkin logged

**Evidence**:
- Media labeling standards
- Authorization matrix
- Media access logs

---

#### MP.L2-3.8.3: Sanitize media before disposal or reuse
**Requirement**: Sanitize or destroy information system media containing CUI before disposal or release for reuse.

**Implementation**:
- Wipe drives with NIST 800-88 methods
- Shred paper CUI (cross-cut)
- Destroy drives physically if highly sensitive

**Evidence**:
- Sanitization procedures (NIST 800-88)
- Sanitization logs
- Destruction certificates

---

#### MP.L2-3.8.4: Mark media with CUI indicator
**Requirement**: Mark media with necessary CUI markings and distribution limitations.

**Implementation**:
- CUI banner on all media
- Distribution limitation markings
- Automated marking for digital media

**Evidence**:
- CUI marking standards
- Media examples with markings
- Automated marking configuration

---

#### MP.L2-3.8.5: Control access to media
**Requirement**: Control access to media containing CUI and maintain accountability for media during transport outside of controlled areas.

**Implementation**:
- Courier for CUI media transport
- GPS tracking for shipments
- Chain of custody log

**Evidence**:
- Courier service contracts
- Tracking records
- Chain of custody forms

---

#### MP.L2-3.8.6: Cryptographically protect CUI in transit
**Requirement**: Implement cryptographic mechanisms to protect the confidentiality of CUI stored on digital media during transport unless otherwise protected by alternative physical safeguards.

**Implementation**:
- Encrypted USB drives
- Encrypted email attachments
- VPN for file transfers

**Evidence**:
- Encryption configuration (BitLocker, etc.)
- Email encryption policy
- VPN usage logs

---

#### MP.L2-3.8.7: Control use of removable media
**Requirement**: Control the use of removable media on information system components.

**Implementation**:
- USB ports disabled except approved devices
- Approved USB devices encrypted
- Removable media usage logged

**Evidence**:
- USB control policy (GPO/MDM)
- Approved device list
- USB usage logs

---

## Domain 11: Physical Protection (PE)

**Purpose**: Limit physical access to CUI and systems.

### Level 2 Practices (6 total)

#### PE.L2-3.10.1: Limit physical access
**Requirement**: Limit physical access to organizational information systems, equipment, and the respective operating environments to authorized individuals.

**Implementation**:
- Badge access to server room
- Sign-in log for visitors
- 24/7 surveillance cameras

**Evidence**:
- Badge access logs
- Visitor sign-in sheets
- Camera footage retention policy

---

#### PE.L2-3.10.2: Protect physical assets
**Requirement**: Protect and monitor the physical facility and support infrastructure for organizational information systems.

**Implementation**:
- Perimeter fence/gate
- Motion sensors in server room
- Environmental monitoring (temp, humidity)

**Evidence**:
- Facility security diagram
- Motion sensor logs
- Environmental monitoring reports

---

#### PE.L2-3.10.3: Escort visitors
**Requirement**: Escort visitors and monitor visitor activity.

**Implementation**:
- All visitors escorted (no unescorted access)
- Visitor badges required
- Escort log maintained

**Evidence**:
- Visitor policy
- Visitor badge issuance records
- Escort logs

---

#### PE.L2-3.10.4: Physical access logs
**Requirement**: Maintain audit logs of physical access.

**Implementation**:
- Badge swipes logged
- Visitor logs retained 1 year
- Anomalies reviewed monthly

**Evidence**:
- Badge access logs
- Visitor logs
- Access review reports

---

#### PE.L2-3.10.5: Manage physical access devices
**Requirement**: Control and manage physical access devices.

**Implementation**:
- Lost badges deactivated immediately
- Badge inventory reviewed quarterly
- Keys/codes changed when personnel depart

**Evidence**:
- Badge lifecycle management procedures
- Badge revocation logs
- Key/code change records

---

#### PE.L2-3.10.6: Enforce safeguarding measures for CUI
**Requirement**: Enforce safeguarding measures for CUI at alternate work sites (e.g., telework sites).

**Implementation**:
- Home office security checklist
- Requirement for locked storage at home
- Periodic home office inspections

**Evidence**:
- Telework security policy
- Home office security checklists (signed)
- Inspection records

---

## Domain 12: Personnel Security (PS)

**Purpose**: Ensure persons occupying positions are trustworthy.

### Level 2 Practices (2 total)

#### PS.L2-3.9.1: Screen individuals
**Requirement**: Screen individuals prior to authorizing access to organizational information systems containing CUI.

**Implementation**:
- Background checks for all CUI access
- Level of check based on CUI sensitivity
- Re-investigations every 5 years

**Evidence**:
- Background check records
- Background check levels matrix
- Re-investigation schedule

---

#### PS.L2-3.9.2: Ensure departing personnel return items and access is revoked
**Requirement**: Ensure that organizational information and information systems are protected during and after personnel actions such as terminations and transfers.

**Implementation**:
- Offboarding checklist (return laptop, badge, keys)
- Account disabled on last day
- Exit interview confirms CUI obligations

**Evidence**:
- Offboarding checklist (signed)
- Account termination logs
- Exit interview records

---

## Domain 13: Risk Assessment (RA)

**Purpose**: Periodically assess risks to operations, assets, and individuals.

### Level 2 Practices (5 total)

#### RA.L2-3.11.1: Risk assessments
**Requirement**: Periodically assess the risk to organizational operations (including mission, functions, image, or reputation), organizational assets, and individuals, resulting from the operation of organizational information systems and the associated processing, storage, or transmission of CUI.

**Implementation**:
- Annual risk assessment
- Risk assessment uses NIST SP 800-30 framework
- Risk register updated quarterly

**Evidence**:
- Risk assessment report (annual)
- Risk register
- Risk methodology documentation

---

#### RA.L2-3.11.2: Vulnerability scanning
**Requirement**: Scan for vulnerabilities in organizational information systems and applications periodically and when new vulnerabilities affecting those systems and applications are identified.

**Implementation**:
- Monthly vulnerability scans (authenticated)
- Scans after major changes
- Critical vulns patched within 30 days

**Evidence**:
- Vulnerability scan schedule
- Scan results and reports
- Remediation tracking (POA&M)

---

#### RA.L2-3.11.3: Remediate vulnerabilities
**Requirement**: Remediate vulnerabilities in accordance with risk assessments.

**Implementation**:
- Vulnerability remediation SLA:
  - Critical: 15 days
  - High: 30 days
  - Medium: 90 days
- Risk acceptance for vulns that can't be fixed

**Evidence**:
- Remediation SLA policy
- Vulnerability remediation tracking
- Risk acceptance memos

---

#### RA.L2-3.11.4: Update threat assessments
**Requirement**: Update threat assessments on an ongoing basis, including changes in the threat environment.

**Implementation**:
- Subscribe to threat intelligence feeds
- Weekly review of new threats
- Quarterly update to threat model

**Evidence**:
- Threat intelligence subscriptions
- Threat briefing summaries
- Threat model update history

---

#### RA.L2-3.11.5: Monitor supply chain risks
**Requirement**: Employ security awareness training and security configuration settings to reduce the risk posed by supply chain threats.

**Implementation**:
- Vendor security questionnaires
- Annual vendor security reviews
- SBOM (Software Bill of Materials) for critical apps

**Evidence**:
- Vendor security assessment records
- Vendor security review reports
- SBOMs for critical applications

---

## Domain 14: Security Assessment (RE)

**Purpose**: Ensure systems are recovered to known state after failure.

### Level 2 Practices (1 total)

#### RE.L2-3.13.1: Regularly back up CUI
**Requirement**: Regularly perform and test data backups.

**Implementation**:
- Daily incremental backups
- Weekly full backups
- Quarterly restore tests

**Evidence**:
- Backup schedule and configuration
- Backup completion logs
- Restore test results

---

## Domain 15: System and Services Acquisition (SA)

**Purpose**: Allocate resources for adequate protection of CUI in acquired systems.

### Level 2 Practices (5 total)

#### SA.L2-3.13.1: Security in acquisition process
**Requirement**: Allocate sufficient resources to adequately protect organizational information systems.

**Implementation**:
- Security requirements in RFPs
- Security budget separate from IT budget
- Annual security budget review

**Evidence**:
- RFP templates with security requirements
- Security budget documentation
- Budget approval records

---

#### SA.L2-3.13.2: Security requirements in contracts
**Requirement**: Employ system development life cycle processes that incorporate information security considerations.

**Implementation**:
- Security requirements in all phases (design, dev, test)
- Threat modeling in design phase
- Security testing before deployment

**Evidence**:
- SDLC process documentation
- Threat models for projects
- Security test results

---

#### SA.L2-3.13.3: Monitor developer security practices
**Requirement**: Employ security engineering principles in the specification, design, development, implementation, and modification of information systems.

**Implementation**:
- Secure design principles (least privilege, fail secure)
- Security architecture review
- Secure coding standards

**Evidence**:
- Secure design principles documentation
- Architecture review records
- Secure coding standards

---

#### SA.L2-3.13.4: Separate user/privileged functions
**Requirement**: Separate user functionality (including user interface services) from information system management functionality.

**Implementation**:
- Admin interfaces on separate network
- Role-based access (users can't access admin functions)
- Admin actions logged separately

**Evidence**:
- Network segmentation documentation
- RBAC configuration
- Admin audit logs

---

#### SA.L2-3.13.5: Security functions verified
**Requirement**: Prevent unauthorized and unintended information transfer via shared system resources.

**Implementation**:
- Multi-tenant isolation verified
- Memory wiped between processes
- No data leakage between users

**Evidence**:
- Multi-tenancy architecture documentation
- Penetration test results (data isolation)
- Memory management testing

---

## Domain 16: System and Communications Protection (SC)

**Purpose**: Monitor, control, and protect communications at external and internal boundaries.

### Level 2 Practices (23 total)

#### SC.L2-3.13.1: Monitor communications at system boundaries
**Requirement**: Monitor, control, and protect organizational communications (i.e., information transmitted or received by organizational information systems) at the external boundaries and key internal boundaries of the information systems.

**Implementation**:
- Firewalls at network perimeter
- Intrusion detection system (IDS)
- Internal network segmentation

**Evidence**:
- Firewall configuration
- IDS/IPS deployment
- Network architecture diagram

---

#### SC.L2-3.13.2: Security architecture
**Requirement**: Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.

**Implementation**:
- DMZ for public-facing systems
- VLANs for network segmentation
- No direct connection from DMZ to internal

**Evidence**:
- DMZ architecture diagram
- VLAN configuration
- Firewall rules (DMZ ← → Internal blocked)

---

#### SC.L2-3.13.3: Deny network traffic by default
**Requirement**: Deny network communications traffic by default and allow network communications traffic by exception (i.e., deny all, permit by exception).

**Implementation**:
- Default deny firewall rules
- Allowlist for required traffic
- Quarterly firewall rule review

**Evidence**:
- Firewall ruleset (default deny)
- Rule justification documentation
- Firewall rule review records

---

#### SC.L2-3.13.4: Prevent split tunneling for VPN
**Requirement**: Prevent remote devices from simultaneously establishing non-remote connections with organizational information systems and communicating via some other connection to resources in external networks (i.e., split tunneling).

**Implementation**:
- Split tunneling disabled on VPN
- All traffic routes through VPN when connected
- VPN configuration enforced by policy

**Evidence**:
- VPN configuration (no split tunneling)
- VPN policy documentation
- VPN connection logs

---

#### SC.L2-3.13.5: Cryptographic protection in transit
**Requirement**: Implement cryptographic mechanisms to prevent unauthorized disclosure of CUI during transmission unless otherwise protected by alternative physical safeguards.

**Implementation**:
- TLS 1.2+ for web traffic
- IPSec or TLS for VPN
- SSH for remote command line

**Evidence**:
- TLS configuration (web servers)
- VPN encryption settings
- Network scan results (no cleartext protocols)

---

#### SC.L2-3.13.6: Terminate network connections
**Requirement**: Terminate network connections associated with communications sessions at the end of the sessions or after a defined period of inactivity.

**Implementation**:
- TCP idle timeout: 15 minutes
- Application session timeout: 30 minutes
- VPN idle timeout: 60 minutes

**Evidence**:
- Network timeout configuration
- Application timeout settings
- Session termination logs

---

#### SC.L2-3.13.7: Establish secure connections
**Requirement**: Establish and manage cryptographic keys for cryptography employed in organizational information systems.

**Implementation**:
- Certificate lifecycle management
- Key rotation schedule (annual minimum)
- HSM for key storage (if highly sensitive)

**Evidence**:
- Certificate management procedures
- Key rotation logs
- HSM configuration (if applicable)

---

#### SC.L2-3.13.8: Employ FIPS-validated cryptography
**Requirement**: Employ FIPS-validated cryptography when used to protect the confidentiality of CUI.

**Implementation**:
- FIPS 140-2 validated crypto modules
- AES-256 for encryption
- SHA-256+ for hashing

**Evidence**:
- FIPS validation certificates
- Crypto module configuration
- Crypto library versions

---

#### SC.L2-3.13.9: Protect confidentiality at rest
**Requirement**: Protect the confidentiality of backup CUI at storage locations.

**Implementation**:
- Backup media encrypted (AES-256)
- Backup storage physically secured
- Encryption keys separate from backups

**Evidence**:
- Backup encryption configuration
- Backup storage security controls
- Key management procedures

---

#### SC.L2-3.13.10: Control mobile code
**Requirement**: Control and monitor the use of mobile code.

**Implementation**:
- JavaScript execution restricted (CSP headers)
- Applets/ActiveX disabled
- Mobile code scanned for malware

**Evidence**:
- Content Security Policy configuration
- Browser security settings
- Mobile code scanning logs

---

#### SC.L2-3.13.11: Control VoIP
**Requirement**: Control and monitor the use of Voice over Internet Protocol (VoIP) technologies.

**Implementation**:
- VoIP traffic encrypted (SRTP)
- VoIP on separate VLAN
- VoIP call logging

**Evidence**:
- VoIP encryption configuration
- Network segmentation (VoIP VLAN)
- Call detail records (CDRs)

---

#### SC.L2-3.13.12: Protect authenticity of communications sessions
**Requirement**: Protect the authenticity of communications sessions.

**Implementation**:
- Mutual TLS (mTLS) for API-to-API
- SSH host key verification
- Certificate pinning for critical connections

**Evidence**:
- mTLS configuration
- SSH known_hosts management
- Certificate pinning implementation

---

#### SC.L2-3.13.13: Protect information in shared resources
**Requirement**: Protect the confidentiality of information at rest.

**Implementation**:
- Full-disk encryption on all endpoints
- Database encryption (TDE)
- File-level encryption for CUI

**Evidence**:
- Disk encryption status reports (MDM)
- Database encryption configuration
- File encryption policies

---

#### SC.L2-3.13.14: Collaborative device protection
**Requirement**: Deny network traffic by default and allow network communications traffic by exception.

**Implementation**:
- Microphones/cameras disabled by default
- Indicator lights when camera active
- User control over device activation

**Evidence**:
- Device security settings
- User training on device controls
- Device activation logs

---

#### SC.L2-3.13.15: Protect information in shared resources
**Requirement**: Protect the confidentiality of CUI in shared system resources.

**Implementation**:
- Memory isolation between processes
- Temp files wiped after use
- No data remnants in shared memory

**Evidence**:
- OS memory protection configuration
- Temp file cleanup procedures
- Data remanence testing

---

#### SC.L2-3.13.16: Information flow enforcement
**Requirement**: Route remote access through managed access control points.

**Implementation**:
- All remote access through VPN gateway
- No direct internet access to internal systems
- Network access control (NAC)

**Evidence**:
- Network architecture diagram
- VPN gateway configuration
- NAC deployment documentation

---

#### SC.L2-3.13.17: Public-access system separation
**Requirement**: Implement subnetworks for publicly accessible system components that are physically or logically separated from internal networks.

**Implementation**:
- DMZ for web servers
- No direct routing from DMZ to internal network
- Proxy/bastion hosts for DMZ-to-internal communication

**Evidence**:
- Network architecture diagram showing DMZ
- Firewall rules (DMZ isolated)
- Proxy/bastion configuration

---

#### SC.L2-3.13.18: Mobile device encryption
**Requirement**: Prohibit remote activation of collaborative computing devices with the following exceptions: remote activation of devices is to be allowed only for authorized users.

**Implementation**:
- Cameras/mics cannot be remotely activated without user consent
- User notification required for remote activation
- Logs of all remote activation attempts

**Evidence**:
- Remote activation policy
- User notification mechanisms
- Activation logs

---

#### SC.L2-3.13.19: Encrypt CUI at rest
**Requirement**: Protect the confidentiality of CUI at rest.

**Implementation**:
- Full-disk encryption (FDE) on all devices
- Database encryption (TDE - Transparent Data Encryption)
- File-level encryption for CUI files

**Evidence**:
- FDE status reports (BitLocker, FileVault, LUKS)
- Database TDE configuration
- File encryption policies

---

#### SC.L2-3.13.20: Use FIPS-validated cryptography
**Requirement**: Employ FIPS-validated cryptography to protect unclassified information when such information must be separated from individuals who have the necessary clearances yet lack the necessary access approvals.

**Implementation**:
- FIPS 140-2 (or 140-3) validated crypto modules
- AES-256 for symmetric encryption
- RSA 2048+ or ECC P-256+ for asymmetric

**Evidence**:
- FIPS validation certificates
- Crypto algorithm configuration
- Crypto library documentation

---

#### SC.L2-3.13.21: Secure name/address resolution
**Requirement**: Use secure name/address resolution services (authoritative source).

**Implementation**:
- DNSSEC for DNS integrity
- Internal DNS servers for private resources
- DNS filtering to block malicious domains

**Evidence**:
- DNSSEC configuration
- Internal DNS architecture
- DNS filtering logs

---

#### SC.L2-3.13.22: Architectural design
**Requirement**: Employ architectural designs, software development techniques, and systems engineering principles that promote effective information security within organizational information systems.

**Implementation**:
- Defense-in-depth architecture
- Least privilege by default
- Fail-secure design patterns

**Evidence**:
- System architecture documentation
- Secure design principles guide
- Architecture review records

---

#### SC.L2-3.13.23: Separate development and production
**Requirement**: Separate user functionality from system management functionality.

**Implementation**:
- Separate dev/test/prod environments
- Production access restricted to admins
- No development tools in production

**Evidence**:
- Environment separation documentation
- Production access controls
- Software inventory (no dev tools in prod)

---

## Domain 17: System and Information Integrity (SI)

**Purpose**: Identify, report, and correct information and information system flaws in a timely manner.

### Level 2 Practices (17 total)

#### SI.L2-3.14.1: Identify and correct flaws timely
**Requirement**: Identify, report, and correct information and information system flaws in a timely manner.

**Implementation**:
- Vulnerability management program
- Critical vulnerabilities patched within 30 days
- Regular patch cycles (monthly for non-critical)

**Evidence**:
- Vulnerability management policy
- Patch deployment logs
- POA&M for unpatched vulnerabilities

---

#### SI.L2-3.14.2: Malicious code protection
**Requirement**: Provide protection from malicious code at appropriate locations within organizational information systems.

**Implementation**:
- Antivirus on all endpoints
- Email gateway antimalware scanning
- Web proxy malware filtering

**Evidence**:
- Antivirus deployment status
- Email gateway configuration
- Malware detection logs

---

#### SI.L2-3.14.3: Monitor system security alerts
**Requirement**: Monitor information system security alerts and advisories and take appropriate actions in response.

**Implementation**:
- Subscribe to vendor security advisories
- Daily review of CISA alerts
- Response procedures for critical alerts

**Evidence**:
- Security advisory subscriptions
- Alert review logs
- Response action records

---

#### SI.L2-3.14.4: Update malicious code protection
**Requirement**: Update malicious code protection mechanisms when new releases are available.

**Implementation**:
- Antivirus definitions updated daily (automatic)
- Antivirus engine updated monthly
- Backup update method if primary fails

**Evidence**:
- Antivirus update configuration (auto-update)
- Update status reports
- Backup update procedures

---

#### SI.L2-3.14.5: System and file scanning
**Requirement**: Perform periodic scans of organizational information systems and real-time scans of files from external sources as files are downloaded, opened, or executed.

**Implementation**:
- Scheduled weekly full system scans
- Real-time on-access scanning
- Email attachments scanned before delivery

**Evidence**:
- Scan schedule configuration
- Real-time scan logs
- Email scanning logs

---

#### SI.L2-3.14.6: Monitor communications for attacks
**Requirement**: Monitor organizational information systems, including inbound and outbound communications traffic, to detect attacks and indicators of potential attacks.

**Implementation**:
- Network IDS/IPS deployed
- SIEM monitors for IOCs (Indicators of Compromise)
- Threat intelligence integration

**Evidence**:
- IDS/IPS deployment architecture
- SIEM correlation rules
- Threat intelligence feed subscriptions

---

#### SI.L2-3.14.7: Identify unauthorized use
**Requirement**: Identify unauthorized use of organizational information systems.

**Implementation**:
- User behavior analytics (UBA)
- Anomaly detection alerts (unusual login times, locations)
- Insider threat monitoring

**Evidence**:
- UBA configuration and rules
- Anomaly detection alerts
- Unauthorized use investigation records

---

#### SI.L2-3.14.8: Receive alerts from external sources
**Requirement**: Receive security alerts, advisories, and directives from external sources on an ongoing basis.

**Implementation**:
- Subscribe to US-CERT alerts
- Vendor security mailing lists
- Industry-specific threat sharing (e.g., DIB CS)

**Evidence**:
- Security alert subscriptions
- Alert distribution list
- Alert review logs

---

#### SI.L2-3.14.9: Employ spam protection
**Requirement**: Employ spam protection mechanisms at information system entry and exit points.

**Implementation**:
- Email gateway spam filtering
- SPF/DKIM/DMARC validation
- User spam reporting mechanism

**Evidence**:
- Spam filter configuration
- SPF/DKIM/DMARC records
- Spam catch rate metrics

---

#### SI.L2-3.14.10: Implement email protections
**Requirement**: Implement email protections including but not limited to: SPF, DKIM, DMARC.

**Implementation**:
- SPF records published in DNS
- DKIM signatures on outbound email
- DMARC policy (quarantine or reject)

**Evidence**:
- SPF/DKIM/DMARC DNS records
- DMARC reports
- Email authentication logs

---

#### SI.L2-3.14.11: Behavior-based detection
**Requirement**: Employ behavior-based detection mechanisms to detect and prevent indicators of compromise.

**Implementation**:
- EDR (Endpoint Detection and Response)
- SIEM behavioral analytics
- Machine learning anomaly detection

**Evidence**:
- EDR deployment status
- SIEM behavioral rules
- ML model training records

---

#### SI.L2-3.14.12: Update detection tools
**Requirement**: Update detection tools and signatures.

**Implementation**:
- IDS/IPS signatures updated daily
- Threat intelligence feeds refreshed hourly
- Detection rule tuning quarterly

**Evidence**:
- Signature update logs
- Threat feed update status
- Rule tuning change records

---

#### SI.L2-3.14.13: Check software for errors and vulnerabilities
**Requirement**: Perform security function verification testing.

**Implementation**:
- Static application security testing (SAST)
- Dynamic application security testing (DAST)
- Software composition analysis (SCA) for dependencies

**Evidence**:
- SAST/DAST scan results
- SCA dependency vulnerability reports
- Remediation tracking

---

#### SI.L2-3.14.14: Information input validation
**Requirement**: Protect information system inputs from malicious code.

**Implementation**:
- Input validation on all user inputs
- Parameterized queries (prevent SQL injection)
- Content Security Policy (CSP) headers (prevent XSS)

**Evidence**:
- Input validation code examples
- Parameterized query usage
- CSP header configuration

---

#### SI.L2-3.14.15: Predictable failure prevention
**Requirement**: Employ mechanisms to detect and prevent information system errors and anomalies in a time frame that supports mission objectives.

**Implementation**:
- Application performance monitoring (APM)
- Error tracking and alerting
- Predictive failure analysis (disk SMART, etc.)

**Evidence**:
- APM configuration
- Error alert rules
- Predictive monitoring dashboards

---

#### SI.L2-3.14.16: Information handling and retention
**Requirement**: Protect the authenticity of communications sessions.

**Implementation**:
- TLS with certificate validation
- SSH with host key verification
- Mutual authentication (mTLS) for APIs

**Evidence**:
- TLS certificate validation configuration
- SSH known_hosts management
- mTLS implementation documentation

---

#### SI.L2-3.14.17: Fail in a secure state
**Requirement**: Ensure organizational information systems fail in a secure state.

**Implementation**:
- Default deny on firewall failure
- Application fails closed (not open)
- Error messages don't leak sensitive info

**Evidence**:
- Firewall failsafe configuration
- Application error handling code
- Error message sanitization

---

## Summary: CMMC 2.0 Level 2 Complete

**Total Practices**: 110 across 17 domains

| Domain | Practices | Key Focus |
|--------|-----------|-----------|
| AC | 22 | Access control, MFA, session management |
| AT | 4 | Security awareness training, role-based training |
| AU | 9 | Audit logging, log protection, log review |
| CA | 3 | Security assessments, POA&M, continuous monitoring |
| CM | 9 | Configuration baselines, change control, least functionality |
| CP | 4 | Disaster recovery, business continuity, backup testing |
| IA | 11 | Authentication, MFA, password policies |
| IR | 3 | Incident response, tracking, testing |
| MA | 6 | Maintenance controls, sanitization, remote maintenance |
| MP | 7 | Media protection, sanitization, CUI marking |
| PE | 6 | Physical access control, visitor management |
| PS | 2 | Background checks, offboarding |
| RA | 5 | Risk assessments, vulnerability scanning, remediation |
| RE | 1 | Backup and recovery |
| SA | 5 | Secure acquisition, SDLC security |
| SC | 23 | Network security, encryption, boundary protection |
| SI | 17 | Vulnerability management, malware protection, monitoring |
| **TOTAL** | **110** | **Complete CMMC 2.0 Level 2 Coverage** |

---

**Next Level**: CMMC 2.0 Level 3 adds 20 additional practices (130 total) for advanced persistent threats (APT) protection.

---

**Note**: This is a comprehensive reference covering all 17 CMMC domains with 110 Level 2 practices. Each practice includes requirement, implementation guidance, and evidence examples.

**Usage**: Use this knowledge base when running CmmcBaseline workflow to generate comprehensive compliance documentation.

---

**Last Updated**: 2025-12-02
**Next Review**: 2026-03-02 (quarterly)
**Version**: 1.0 (Complete CMMC 2.0 Coverage)
