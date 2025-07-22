/**
 * JT808 Message Structure Definitions
 * Defines message ID constants, structure mappings, and validation schemas
 */

/**
 * JT808 Message ID Constants
 */
const MESSAGE_IDS = {
  // Terminal -> Platform messages
  TERMINAL_REGISTRATION: 0x0100,
  TERMINAL_UNREGISTER: 0x0003,
  TERMINAL_AUTH: 0x0102,
  TERMINAL_HEARTBEAT: 0x0002,
  LOCATION_REPORT: 0x0200,
  LOCATION_BATCH_REPORT: 0x0704,
  MULTIMEDIA_EVENT_UPLOAD: 0x0800,
  MULTIMEDIA_DATA_UPLOAD: 0x0801,
  MULTIMEDIA_INFO_REPORT: 0x0301,
  CAMERA_SHOT_IMMEDIATELY: 0x0805,
  STORED_MULTIMEDIA_SEARCH: 0x0802,
  STORED_MULTIMEDIA_UPLOAD: 0x0803,
  DATA_UPLINK_TRANSPARENT: 0x0900,
  DATA_COMPRESSION_REPORT: 0x0901,
  TERMINAL_RSA_PUBLIC_KEY: 0x0a00,

  // Platform -> Terminal messages
  PLATFORM_GENERAL_RESPONSE: 0x8001,
  PLATFORM_HEARTBEAT: 0x8003,
  TERMINAL_REGISTRATION_RESPONSE: 0x8100,
  SET_TERMINAL_PARAMETERS: 0x8103,
  QUERY_TERMINAL_PARAMETERS: 0x8104,
  TERMINAL_CONTROL: 0x8105,
  QUERY_TERMINAL_ATTRIBUTES: 0x8107,
  UPGRADE_PACKAGE_DOWNLOAD: 0x8108,
  LOCATION_INFO_QUERY: 0x8201,
  TEMPORARY_LOCATION_TRACKING: 0x8202,
  MANUAL_CONFIRMATION_ALARM: 0x8203,
  TEXT_MESSAGE_SEND: 0x8300,
  EVENT_SETTING: 0x8301,
  QUESTION_SEND: 0x8302,
  INFO_MENU_SETTING: 0x8303,
  INFO_SERVICE: 0x8304,
  PHONE_CALLBACK: 0x8400,
  SET_PHONE_BOOK: 0x8401,
  VEHICLE_CONTROL: 0x8500,
  SET_CIRCULAR_AREA: 0x8600,
  DELETE_CIRCULAR_AREA: 0x8601,
  SET_RECTANGULAR_AREA: 0x8602,
  DELETE_RECTANGULAR_AREA: 0x8603,
  SET_POLYGON_AREA: 0x8604,
  DELETE_POLYGON_AREA: 0x8605,
  SET_ROUTE: 0x8606,
  DELETE_ROUTE: 0x8607,
  DRIVING_RECORD_DATA_COLLECT: 0x8700,
  DRIVING_RECORD_PARAMETER_DOWNLOAD: 0x8701,
  CAMERA_SHOT_COMMAND: 0x8801,
  STORED_MULTIMEDIA_SEARCH_COMMAND: 0x8802,
  STORED_MULTIMEDIA_UPLOAD_COMMAND: 0x8803,
  AUDIO_RECORD_START: 0x8804,
  SINGLE_STORED_MULTIMEDIA_SEARCH: 0x8805,
  DATA_DOWNLINK_TRANSPARENT: 0x8900,
  PLATFORM_RSA_PUBLIC_KEY: 0x8a00,
};

/**
 * Message structure definitions
 */
const MESSAGE_STRUCTURES = {
  [MESSAGE_IDS.TERMINAL_REGISTRATION]: {
    name: "Terminal Registration",
    direction: "up",
    fields: [
      { name: "provinceId", type: "uint16", description: "Province ID" },
      { name: "cityId", type: "uint16", description: "City ID" },
      {
        name: "manufacturerId",
        type: "string",
        length: 5,
        description: "Manufacturer ID",
      },
      {
        name: "deviceModel",
        type: "string",
        length: 8,
        description: "Device Model",
      },
      { name: "deviceId", type: "string", length: 7, description: "Device ID" },
      { name: "plateColor", type: "uint8", description: "Plate Color" },
      {
        name: "plateNumber",
        type: "string",
        variable: true,
        description: "Plate Number",
      },
    ],
  },

  [MESSAGE_IDS.TERMINAL_REGISTRATION_RESPONSE]: {
    name: "Terminal Registration Response",
    direction: "down",
    fields: [
      {
        name: "sequenceNumber",
        type: "uint16",
        description: "Sequence number of registration message",
      },
      {
        name: "result",
        type: "uint8",
        description:
          "Registration result (0=success, 1=vehicle registered, 2=no vehicle in database, 3=terminal registered, 4=no terminal in database)",
      },
      {
        name: "authCode",
        type: "string",
        variable: true,
        description: "Authentication code (only if result=0)",
      },
    ],
  },

  [MESSAGE_IDS.TERMINAL_AUTH]: {
    name: "Terminal Authentication",
    direction: "up",
    fields: [
      {
        name: "authCode",
        type: "string",
        variable: true,
        description: "Authentication code from registration response",
      },
    ],
  },

  [MESSAGE_IDS.TERMINAL_HEARTBEAT]: {
    name: "Terminal Heartbeat",
    direction: "up",
    fields: [], // No body data
  },

  [MESSAGE_IDS.PLATFORM_GENERAL_RESPONSE]: {
    name: "Platform General Response",
    direction: "down",
    fields: [
      {
        name: "sequenceNumber",
        type: "uint16",
        description: "Sequence number of original message",
      },
      {
        name: "messageId",
        type: "uint16",
        description: "Message ID of original message",
      },
      {
        name: "result",
        type: "uint8",
        description:
          "Processing result (0=success, 1=failure, 2=message error, 3=not supported)",
      },
    ],
  },

  [MESSAGE_IDS.LOCATION_REPORT]: {
    name: "Location Information Report",
    direction: "up",
    fields: [
      { name: "alarmFlag", type: "uint32", description: "Alarm flag" },
      { name: "statusFlag", type: "uint32", description: "Status flag" },
      {
        name: "latitude",
        type: "uint32",
        description: "Latitude (degrees * 10^6)",
      },
      {
        name: "longitude",
        type: "uint32",
        description: "Longitude (degrees * 10^6)",
      },
      { name: "altitude", type: "uint16", description: "Altitude (meters)" },
      { name: "speed", type: "uint16", description: "Speed (0.1 km/h)" },
      {
        name: "direction",
        type: "uint16",
        description: "Direction (0-359 degrees)",
      },
      {
        name: "timestamp",
        type: "bcd",
        length: 6,
        description: "Time (YYMMDDHHMMSS)",
      },
      {
        name: "additionalInfo",
        type: "bytes",
        variable: true,
        description: "Additional information",
      },
    ],
  },

  [MESSAGE_IDS.LOCATION_BATCH_REPORT]: {
    name: "Location Batch Report",
    direction: "up",
    fields: [
      {
        name: "dataType",
        type: "uint8",
        description: "Data type (0=normal, 1=blind area supplement)",
      },
      {
        name: "itemCount",
        type: "uint16",
        description: "Number of location items",
      },
      {
        name: "locationItems",
        type: "array",
        itemType: "location",
        description: "Array of location data",
      },
    ],
  },

  [MESSAGE_IDS.MULTIMEDIA_EVENT_UPLOAD]: {
    name: "Multimedia Event Upload",
    direction: "up",
    fields: [
      { name: "multimediaId", type: "uint32", description: "Multimedia ID" },
      {
        name: "multimediaType",
        type: "uint8",
        description: "Multimedia type (0=image, 1=audio, 2=video)",
      },
      {
        name: "multimediaFormat",
        type: "uint8",
        description: "Multimedia format",
      },
      { name: "eventCode", type: "uint8", description: "Event code" },
      { name: "channelId", type: "uint8", description: "Channel ID" },
      {
        name: "locationInfo",
        type: "location",
        description: "Location information",
      },
      {
        name: "multimediaData",
        type: "bytes",
        variable: true,
        description: "Multimedia data",
      },
    ],
  },

  [MESSAGE_IDS.SET_TERMINAL_PARAMETERS]: {
    name: "Set Terminal Parameters",
    direction: "down",
    fields: [
      {
        name: "parameterCount",
        type: "uint8",
        description: "Number of parameters",
      },
      {
        name: "parameters",
        type: "array",
        itemType: "parameter",
        description: "Parameter list",
      },
    ],
  },

  [MESSAGE_IDS.TERMINAL_CONTROL]: {
    name: "Terminal Control",
    direction: "down",
    fields: [
      { name: "commandFlag", type: "uint8", description: "Command flag" },
      {
        name: "commandParameter",
        type: "string",
        variable: true,
        description: "Command parameter",
      },
    ],
  },

  [MESSAGE_IDS.CAMERA_SHOT_COMMAND]: {
    name: "Camera Shot Command",
    direction: "down",
    fields: [
      { name: "channelId", type: "uint8", description: "Channel ID" },
      { name: "shotCommand", type: "uint16", description: "Shot command" },
      {
        name: "shotInterval",
        type: "uint16",
        description: "Shot interval (seconds)",
      },
      { name: "shotCount", type: "uint16", description: "Shot count" },
      {
        name: "saveFlag",
        type: "uint8",
        description: "Save flag (1=save, 0=upload)",
      },
      { name: "resolution", type: "uint8", description: "Resolution" },
      { name: "quality", type: "uint8", description: "Image quality (1-10)" },
      { name: "brightness", type: "uint8", description: "Brightness (0-255)" },
      { name: "contrast", type: "uint8", description: "Contrast (0-127)" },
      { name: "saturation", type: "uint8", description: "Saturation (0-127)" },
      { name: "chroma", type: "uint8", description: "Chroma (0-255)" },
    ],
  },
};

/**
 * Alarm flag bit definitions
 */
const ALARM_FLAGS = {
  EMERGENCY_ALARM: 0x00000001,
  OVERSPEED_ALARM: 0x00000002,
  FATIGUE_DRIVING: 0x00000004,
  DANGEROUS_DRIVING: 0x00000008,
  GNSS_MODULE_FAULT: 0x00000010,
  GNSS_ANTENNA_DISCONNECTED: 0x00000020,
  GNSS_ANTENNA_SHORT_CIRCUIT: 0x00000040,
  MAIN_POWER_UNDERVOLTAGE: 0x00000080,
  MAIN_POWER_POWER_DOWN: 0x00000100,
  LCD_FAULT: 0x00000200,
  TTS_MODULE_FAULT: 0x00000400,
  CAMERA_FAULT: 0x00000800,
  ROAD_TRANSPORT_CERTIFICATE_IC_CARD_MODULE_FAULT: 0x00001000,
  OVERSPEED_WARNING: 0x00002000,
  FATIGUE_DRIVING_WARNING: 0x00004000,
  ILLEGAL_IGNITION: 0x00008000,
  ILLEGAL_DISPLACEMENT: 0x00010000,
  VSS_FAULT: 0x00020000,
  OIL_ABNORMAL: 0x00040000,
  VEHICLE_THEFT: 0x00080000,
  VEHICLE_ILLEGAL_IGNITION: 0x00100000,
  VEHICLE_ILLEGAL_DISPLACEMENT: 0x00200000,
  COLLISION_ROLLOVER_ALARM: 0x00400000,
  ROLLOVER_ALARM: 0x00800000,
};

/**
 * Status flag bit definitions
 */
const STATUS_FLAGS = {
  ACC_ON: 0x00000001,
  POSITIONING: 0x00000002,
  SOUTH_LATITUDE: 0x00000004,
  WEST_LONGITUDE: 0x00000008,
  OPERATION_STATUS: 0x00000010,
  LATITUDE_LONGITUDE_ENCRYPTED: 0x00000020,
  FORWARD_COLLISION_WARNING: 0x00000040,
  LANE_DEPARTURE_WARNING: 0x00000080,
  LOAD_STATUS: 0x00000100,
  VEHICLE_OIL_CIRCUIT_NORMAL: 0x00000200,
  VEHICLE_CIRCUIT_NORMAL: 0x00000400,
  DOOR_LOCK: 0x00000800,
  DOOR1_OPEN: 0x00001000,
  DOOR2_OPEN: 0x00002000,
  DOOR3_OPEN: 0x00004000,
  DOOR4_OPEN: 0x00008000,
  DOOR5_OPEN: 0x00010000,
  GPS_POSITIONING: 0x00020000,
  BEIDOU_POSITIONING: 0x00040000,
  GLONASS_POSITIONING: 0x00080000,
  GALILEO_POSITIONING: 0x00100000,
};

/**
 * Terminal parameter IDs
 */
const TERMINAL_PARAMETERS = {
  HEARTBEAT_INTERVAL: 0x0001,
  TCP_TIMEOUT: 0x0002,
  TCP_RETRANSMISSION_COUNT: 0x0003,
  UDP_TIMEOUT: 0x0004,
  UDP_RETRANSMISSION_COUNT: 0x0005,
  SMS_TIMEOUT: 0x0006,
  SMS_RETRANSMISSION_COUNT: 0x0007,
  MAIN_SERVER_APN: 0x0010,
  MAIN_SERVER_USERNAME: 0x0011,
  MAIN_SERVER_PASSWORD: 0x0012,
  MAIN_SERVER_IP: 0x0013,
  BACKUP_SERVER_APN: 0x0014,
  BACKUP_SERVER_USERNAME: 0x0015,
  BACKUP_SERVER_PASSWORD: 0x0016,
  BACKUP_SERVER_IP: 0x0017,
  SERVER_TCP_PORT: 0x0018,
  SERVER_UDP_PORT: 0x0019,
  POSITION_REPORT_STRATEGY: 0x0020,
  POSITION_REPORT_SCHEME: 0x0021,
  UNLOGGED_POSITION_REPORT_INTERVAL: 0x0022,
  SLEEP_POSITION_REPORT_INTERVAL: 0x0023,
  EMERGENCY_POSITION_REPORT_INTERVAL: 0x0024,
  DEFAULT_POSITION_REPORT_INTERVAL: 0x0025,
  DEFAULT_POSITION_REPORT_DISTANCE: 0x0026,
  UNLOGGED_POSITION_REPORT_DISTANCE: 0x0027,
  SLEEP_POSITION_REPORT_DISTANCE: 0x0028,
  EMERGENCY_POSITION_REPORT_DISTANCE: 0x0029,
  CORNER_SUPPLEMENT_ANGLE: 0x002c,
  ELECTRONIC_FENCE_RADIUS: 0x002d,
  PLATFORM_PHONE_NUMBER: 0x0040,
  RESET_PHONE_NUMBER: 0x0041,
  RESTORE_FACTORY_PHONE_NUMBER: 0x0042,
  PLATFORM_SMS_PHONE_NUMBER: 0x0043,
  TERMINAL_PHONE_ANSWER_STRATEGY: 0x0044,
  MAX_CALL_TIME: 0x0045,
  MAX_CALL_TIME_MONTH: 0x0046,
  MONITOR_PHONE_NUMBER: 0x0047,
  PRIVILEGE_SMS_PHONE_NUMBER: 0x0048,
  ALARM_MASK: 0x0050,
  ALARM_SMS_SWITCH: 0x0051,
  ALARM_SMS_TEXT: 0x0052,
  ALARM_PHOTO_SWITCH: 0x0053,
  ALARM_PHOTO_SAVE_FLAG: 0x0054,
  KEY_FLAG: 0x0055,
  MAX_SPEED: 0x0056,
  OVERSPEED_DURATION: 0x0057,
  CONTINUOUS_DRIVING_TIME_THRESHOLD: 0x0058,
  CUMULATIVE_DRIVING_TIME_THRESHOLD: 0x0059,
  MINIMUM_REST_TIME: 0x005a,
  MAXIMUM_PARKING_TIME: 0x005b,
  OVERSPEED_WARNING_DIFFERENCE: 0x005c,
  FATIGUE_DRIVING_WARNING_DIFFERENCE: 0x005d,
  COLLISION_ALARM_PARAMETER: 0x005e,
  ROLLOVER_ALARM_PARAMETER: 0x005f,
  CAMERA_PARAMETER: 0x0070,
  VIDEO_RECORDING_PARAMETER: 0x0071,
  AUDIO_RECORDING_PARAMETER: 0x0072,
  PHOTO_PARAMETER: 0x0073,
  DATA_UPLOAD_MODE: 0x0074,
  DATA_UPLOAD_SETTING: 0x0075,
  CAN_BUS_CHANNEL_1_COLLECT_INTERVAL: 0x0076,
  CAN_BUS_CHANNEL_1_UPLOAD_INTERVAL: 0x0077,
  CAN_BUS_CHANNEL_2_COLLECT_INTERVAL: 0x0078,
  CAN_BUS_CHANNEL_2_UPLOAD_INTERVAL: 0x0079,
  CAN_BUS_ID_COLLECT_SETTING: 0x007a,
};

/**
 * Multimedia types
 */
const MULTIMEDIA_TYPES = {
  IMAGE: 0x00,
  AUDIO: 0x01,
  VIDEO: 0x02,
};

/**
 * Multimedia formats
 */
const MULTIMEDIA_FORMATS = {
  JPEG: 0x00,
  TIF: 0x01,
  MP3: 0x02,
  WAV: 0x03,
  WMV: 0x04,
  MP4: 0x05,
  FLV: 0x06,
  AVI: 0x07,
  H264: 0x08,
};

/**
 * Event codes for multimedia
 */
const EVENT_CODES = {
  PLATFORM_COMMAND: 0x00,
  TIMER_COMMAND: 0x01,
  ROBBERY_ALARM: 0x02,
  COLLISION_ROLLOVER_ALARM: 0x03,
  DOOR_OPEN_PHOTO: 0x04,
  DOOR_CLOSE_PHOTO: 0x05,
  DOOR_OPEN_TO_DOOR_CLOSE: 0x06,
  DOOR_CLOSE_TO_DOOR_OPEN: 0x07,
  VSS_SPEED_LOWER_THRESHOLD: 0x08,
  VSS_SPEED_HIGHER_THRESHOLD: 0x09,
  CUMULATIVE_DRIVING_TIMEOUT: 0x0a,
  PARKING_TIMEOUT: 0x0b,
  IN_OUT_AREA: 0x0c,
  IN_OUT_ROUTE: 0x0d,
  ROUTE_DRIVING_TIME_INSUFFICIENT_OR_OVERTIME: 0x0e,
  ROUTE_DEVIATION_ALARM: 0x0f,
  VSS_FAULT: 0x10,
  OIL_ABNORMAL: 0x11,
  VEHICLE_THEFT: 0x12,
  VEHICLE_ILLEGAL_IGNITION: 0x13,
  VEHICLE_ILLEGAL_DISPLACEMENT: 0x14,
  COLLISION_ROLLOVER_ALARM_2: 0x15,
  ILLEGAL_OPEN_DOOR_ALARM: 0x16,
};

module.exports = {
  MESSAGE_IDS,
  MESSAGE_STRUCTURES,
  ALARM_FLAGS,
  STATUS_FLAGS,
  TERMINAL_PARAMETERS,
  MULTIMEDIA_TYPES,
  MULTIMEDIA_FORMATS,
  EVENT_CODES,
};
