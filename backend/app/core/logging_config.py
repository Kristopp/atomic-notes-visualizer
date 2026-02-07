"""
Centralized Logging Configuration for Atomic Notes Visualizer
Supports both FastAPI (Uvicorn) and Celery with structured logging
"""
import logging
import sys
from contextvars import ContextVar
from typing import Any, Dict
import structlog
from pythonjsonlogger import jsonlogger

# Context variable to store request ID across async boundaries
request_id_var: ContextVar[str] = ContextVar("request_id", default=None)


def get_request_id() -> str | None:
    """Get the current request ID from context"""
    return request_id_var.get(None)


def set_request_id(request_id: str) -> None:
    """Set the request ID in context"""
    request_id_var.set(request_id)


def add_request_id(logger: Any, method_name: str, event_dict: Dict) -> Dict:
    """
    Structlog processor that adds request_id to every log entry
    """
    request_id = get_request_id()
    if request_id:
        event_dict["request_id"] = request_id
    return event_dict


def add_severity_level(logger: Any, method_name: str, event_dict: Dict) -> Dict:
    """
    Structlog processor that adds severity level for compatibility
    """
    if method_name == "warning":
        event_dict["severity"] = "WARNING"
    else:
        event_dict["severity"] = method_name.upper()
    return event_dict


class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """
    Custom JSON formatter that includes request_id from context
    """
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


def setup_logging(
    level: str = "INFO",
    use_json: bool = False,
    service_name: str = "atomic-notes-api"
) -> None:
    """
    Configure logging for the entire application
    
    Args:
        level: Log level (DEBUG, INFO, WARNING, ERROR, CRITICAL)
        use_json: If True, output JSON logs; if False, use pretty console logs
        service_name: Name of the service for log identification
    """
    log_level = getattr(logging, level.upper(), logging.INFO)
    
    # Configure standard library logging
    logging.basicConfig(
        level=log_level,
        format="%(message)s",
        handlers=[logging.StreamHandler(sys.stdout)]
    )
    
    if use_json:
        # Production mode: JSON logging for machine parsing
        # Configure root logger with JSON formatter
        root_logger = logging.getLogger()
        root_logger.handlers.clear()
        
        json_handler = logging.StreamHandler(sys.stdout)
        json_formatter = CustomJsonFormatter(
            "%(timestamp)s %(severity)s %(logger)s %(message)s %(request_id)s"
        )
        json_handler.setFormatter(json_formatter)
        root_logger.addHandler(json_handler)
        root_logger.setLevel(log_level)
        
        # Configure structlog for JSON output
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
        # Development mode: Pretty console logging with colors
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
    
    # Create a logger instance to confirm setup
    logger = structlog.get_logger(service_name)
    logger.info(f"Logging configured", level=level, json_mode=use_json, service=service_name)


def get_logger(name: str) -> structlog.BoundLogger:
    """
    Get a configured structlog logger instance
    
    Args:
        name: Logger name (typically __name__)
    
    Returns:
        Configured structlog logger
    """
    return structlog.get_logger(name)
