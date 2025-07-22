# Requirements Document

## Introduction

This document outlines the requirements for a Node.js-based JT808/JT1078 server that serves as middleware between Chinese-manufactured dashcams and a custom fleet management platform. The server will handle GPS tracking, video/audio uploads, media playback, and remote command execution without relying on third-party cloud services.

## Requirements

### Requirement 1

**User Story:** As a fleet manager, I want dashcams to register with my server, so that I can establish communication and track vehicle status.

#### Acceptance Criteria

1. WHEN a dashcam sends a 0x0100 terminal registration message THEN the server SHALL parse the message and extract device information
2. WHEN registration is requested THEN the server SHALL verify device ID exists in authorized device database
3. WHEN registration is successful AND device is authorized THEN the server SHALL respond with 0x8100 registration response message
4. WHEN registration fails OR device is not in database THEN the server SHALL respond with appropriate error code in 0x8100 message
5. IF a device attempts to register without being pre-authorized THEN the server SHALL reject the registration

### Requirement 2

**User Story:** As a system administrator, I want to maintain persistent connections with dashcams, so that real-time communication is possible.

#### Acceptance Criteria

1. WHEN a dashcam connects THEN the server SHALL maintain a TCP socket connection
2. WHEN a dashcam sends 0x0002 heartbeat messages THEN the server SHALL respond with 0x8001 general response
3. WHEN a connection is lost THEN the server SHALL log the disconnection and clean up resources
4. WHEN heartbeat is not received within timeout period THEN the server SHALL mark device as offline

### Requirement 3

**User Story:** As a fleet manager, I want to receive real-time GPS location data from vehicles, so that I can track their positions and routes.

#### Acceptance Criteria

1. WHEN a dashcam sends 0x0200 location info report THEN the server SHALL parse GPS coordinates, speed, and direction
2. WHEN location data is received THEN the server SHALL store it with timestamp and device ID
3. WHEN a dashcam sends 0x0704 batch GPS report THEN the server SHALL process multiple location points
4. WHEN location data is invalid THEN the server SHALL log the error and request retransmission

### Requirement 4

**User Story:** As a fleet manager, I want to request location data on-demand, so that I can get current vehicle positions when needed.

#### Acceptance Criteria

1. WHEN I request current location THEN the server SHALL send 0x8201 on-demand location command to dashcam
2. WHEN dashcam responds with location THEN the server SHALL provide the data via API or WebSocket
3. WHEN location request times out THEN the server SHALL return appropriate error status
4. IF device is offline THEN the server SHALL return device unavailable status

### Requirement 5

**User Story:** As a fleet manager, I want to receive multimedia events from dashcams, so that I can review incidents and monitor driver behavior.

#### Acceptance Criteria

1. WHEN a dashcam sends 0x0800 multimedia event upload THEN the server SHALL receive and store the media file
2. WHEN a dashcam sends 0x0301 multimedia info report THEN the server SHALL parse metadata and file information
3. WHEN media upload is complete THEN the server SHALL send confirmation response
4. WHEN media file is corrupted THEN the server SHALL request retransmission

### Requirement 6

**User Story:** As a fleet manager, I want to request stored media from dashcams, so that I can retrieve specific recordings for review.

#### Acceptance Criteria

1. WHEN I request stored media THEN the server SHALL send 0x8801 request stored media command
2. WHEN dashcam responds with media list THEN the server SHALL provide available recordings
3. WHEN I select specific media THEN the server SHALL initiate download process
4. WHEN media download completes THEN the server SHALL store file and provide access via API

### Requirement 7

**User Story:** As a fleet manager, I want to view real-time video streams from dashcams, so that I can monitor live situations.

#### Acceptance Criteria

1. WHEN I request real-time video THEN the server SHALL send 0x8802 request real-time video command
2. WHEN dashcam starts streaming THEN the server SHALL handle JT1078 protocol packets (0x9101, 0x9201)
3. WHEN video packets are received THEN the server SHALL reassemble H.264 frames
4. WHEN stream is active THEN the server SHALL forward video via WebSocket or save as .h264 file

### Requirement 8

**User Story:** As a fleet manager, I want to send remote commands to vehicles, so that I can control dashcam settings and vehicle functions.

#### Acceptance Criteria

1. WHEN I send parameter settings THEN the server SHALL transmit 0x8103 terminal parameter settings command
2. WHEN I send remote control commands THEN the server SHALL transmit 0x8105 commands (e.g., engine cut-off)
3. WHEN command is sent THEN the server SHALL wait for acknowledgment from dashcam
4. WHEN command fails THEN the server SHALL retry and report failure status

### Requirement 9

**User Story:** As a system administrator, I want comprehensive logging and monitoring, so that I can troubleshoot issues and monitor system health.

#### Acceptance Criteria

1. WHEN any protocol message is processed THEN the server SHALL log message type, device ID, and timestamp
2. WHEN errors occur THEN the server SHALL log detailed error information with context
3. WHEN connections change state THEN the server SHALL log connection events
4. WHEN media operations occur THEN the server SHALL log file operations and sizes

### Requirement 10

**User Story:** As a developer, I want API and WebSocket interfaces, so that I can integrate the server with my fleet management platform.

#### Acceptance Criteria

1. WHEN platform requests device status THEN the server SHALL provide current connection and location data via API
2. WHEN real-time events occur THEN the server SHALL broadcast updates via WebSocket
3. WHEN platform sends commands THEN the server SHALL accept them via API and forward to devices
4. WHEN media is available THEN the server SHALL provide download URLs via API

### Requirement 11

**User Story:** As a system administrator, I want easy deployment and configuration, so that I can set up the server on local or VPS environments.

#### Acceptance Criteria

1. WHEN I follow setup instructions THEN the server SHALL start successfully with default configuration
2. WHEN I configure dashcam settings THEN the device SHALL connect to server using provided IP/port
3. WHEN server starts THEN it SHALL create necessary directories for media storage
4. WHEN configuration changes THEN the server SHALL reload settings without restart if possible

### Requirement 12

**User Story:** As a fleet manager, I want to receive alarm notifications from dashcams, so that I can respond to emergency situations and safety events.

#### Acceptance Criteria

1. WHEN a dashcam detects an alarm condition THEN it SHALL send alarm data via JT808 protocol
2. WHEN alarm data is received THEN the server SHALL parse alarm type, severity, and associated data
3. WHEN critical alarms occur THEN the server SHALL immediately notify connected clients via WebSocket
4. WHEN alarm data includes media THEN the server SHALL prioritize processing and storage

### Requirement 13

**User Story:** As a fleet manager, I want two-way audio communication with vehicles, so that I can communicate with drivers in real-time.

#### Acceptance Criteria

1. WHEN I initiate audio call THEN the server SHALL establish audio channel using JT1078 protocol
2. WHEN audio data is received from dashcam THEN the server SHALL forward it to connected client
3. WHEN I send audio to dashcam THEN the server SHALL transmit it using appropriate JT1078 commands
4. WHEN audio session ends THEN the server SHALL properly close the audio channel

### Requirement 14

**User Story:** As a system administrator, I want to remotely configure dashcam network settings via SMS, so that I can update server connections without physical access.

#### Acceptance Criteria

1. WHEN SMS configuration command is sent THEN the dashcam SHALL update its server IP and port settings
2. WHEN network settings change THEN the dashcam SHALL reconnect to new server address
3. WHEN SMS configuration is successful THEN the dashcam SHALL send confirmation message
4. WHEN SMS configuration fails THEN the dashcam SHALL maintain current settings and report error

### Requirement 15

**User Story:** As a system administrator, I want to remotely configure dashcam hotspot settings, so that I can manage device connectivity options.

#### Acceptance Criteria

1. WHEN hotspot configuration command is sent THEN the server SHALL transmit settings via JT808 protocol
2. WHEN hotspot settings are updated THEN the dashcam SHALL apply new WiFi configuration
3. WHEN hotspot configuration is successful THEN the dashcam SHALL confirm settings update
4. WHEN hotspot configuration fails THEN the dashcam SHALL maintain current settings

### Requirement 16

**User Story:** As a fleet manager, I want a test dashboard or CLI interface, so that I can verify server functionality and view media events.

#### Acceptance Criteria

1. WHEN I access the test interface THEN I SHALL see connected devices and their status
2. WHEN media events occur THEN they SHALL be displayed in real-time on the interface
3. WHEN I select a device THEN I SHALL see its location history and media files
4. WHEN video streaming is active THEN I SHALL be able to view the stream in browser
5. WHEN alarms are triggered THEN they SHALL be prominently displayed with alert notifications
