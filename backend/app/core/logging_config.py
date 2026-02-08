"""
Centralized Logging Configuration for Atomic Notes Visualizer
Supports both FastAPI (Uvicorn) and Celery with structured logging
"""
import logging
import sys
import os
from contextvars import ContextVar
from typing import Any, Dict
from logging.handlers import RotatingFileHandler
import structlog
from pythonjsonlogger import jsonlogger

# Context variable to store request ID across async boundaries
request_id_var: ContextVar[str] = ContextVar("request_id", default=None)

# Log file path
LOG_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "logs")
LOG_FILE = os.path.join(LOG_DIR, "app.log")


def get_request_id() -> str | None:
    """Get the current request ID from context"""
    return request_id_var.get(None)


def set_request_id(request_id: str) -> None:
    """Set the request ID in context"""
    request_id_var.set(request_id)


def add_request_id(logger: Any, method_name: str, event_dict: Dict) -> Dict:
    """Structlog processor that adds request_id to every log entry"""
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def add_severity_level(logger: Any, method_name: str, event_dict: Dict) -> Dict:
    """Structlog processor that adds severity level for compatibility"""
    if method_name == "warning":
        event_dict["severity"] = "WARNING"
    else:
        event_dict["severity"] = method_name.upper()
    return event_dict


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter that includes request_id from context"""
    def add_fields(self, log_record: Dict, record: logging.LogRecord, message_dict: Dict) -> None:
        super(CustomJsonFormatter, self).add_fields(log_record, record, message_dict)
        
        # Add request_id if available
        request_id = get_request_id()
        if request_id:
            log_record['request_id'] = request_id
        
        # Add severity
        log_record['severity'] = record.levelname
        
        # Add logger name
        log_record['logger'] = record.name
        
        # Add exception info if present
        if record.exc_info:
            log_record['exception'] = self.formatException(record.exc_info)


def ensure_log_directory():
    """Create log directory if it doesn't exist"""
    if not os.path.exists(LOG_DIR):
        os.makedirs(LOG_DIR)


def setup_logging(
    level: str = "INFO",
    use_json: bool = False,
    service_name: str = "atomic-notes-api"
) -> None:
    """
    Configure logging for the entire application
    Logs to both console AND file for easy debugging
    """
    ensure_log_directory()
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Clear any existing handlers
    root_logger = logging.getLogger()
    root_logger.handlers.clear()
    root_logger.setLevel(log_level)
    
    # Console handler - ALWAYS visible in terminal
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    
    # File handler - writes to logs/app.log
    file_handler = RotatingFileHandler(
        LOG_FILE,
        maxBytes=10*1024*1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(log_level)
    
    if use_json:
        # Production: JSON format
        json_formatter = CustomJsonFormatter(
            "%(timestamp)s %(severity)s %(logger)s %(message)s %(request_id)s"
        )
        console_handler.setFormatter(json_formatter)
        file_handler.setFormatter(json_formatter)
        
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                add_request_id,
                add_severity_level,
                structlog.processors.TimeStamper(fmt="iso"),
                structlog.processors.StackInfoRenderer(),
                structlog.processors.format_exc_info,
                structlog.processors.JSONRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(log_level),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    else:
        # Development: Pretty format with colors
        console_format = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        console_handler.setFormatter(console_format)
        
        # File gets detailed format
        file_format = logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s (%(filename)s:%(lineno)d): %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S"
        )
        file_handler.setFormatter(file_format)
        
        structlog.configure(
            processors=[
                structlog.contextvars.merge_contextvars,
                add_request_id,
                structlog.processors.TimeStamper(fmt="%Y-%m-%d %H:%M:%S"),
                structlog.dev.set_exc_info,
                structlog.processors.StackInfoRenderer(),
                structlog.dev.ConsoleRenderer()
            ],
            wrapper_class=structlog.make_filtering_bound_logger(log_level),
            context_class=dict,
            logger_factory=structlog.PrintLoggerFactory(),
            cache_logger_on_first_use=True,
        )
    
    # Add both handlers to root logger
    root_logger.addHandler(console_handler)
    root_logger.addHandler(file_handler)
    
    # Also configure uvicorn loggers to use our handlers
    for logger_name in ["uvicorn", "uvicorn.access", "uvicorn.error", "fastapi"]:
        logger = logging.getLogger(logger_name)
        logger.handlers.clear()
        logger.propagate = False
        logger.addHandler(console_handler)
        logger.addHandler(file_handler)
        logger.setLevel(log_level)
    
    # Create a logger instance to confirm setup
    logger = structlog.get_logger(service_name)
    logger.info(f"Logging configured", 
                level=level, 
                json_mode=use_json, 
                service=service_name,
                log_file=LOG_FILE)
    
    # Log a test error to verify it's working
    logger.debug("Debug logging enabled - test message")


def get_logger(name: str) -> structlog.BoundLogger:
    """Get a configured structlog logger instance"""
    return structlog.get_logger(name)
