#!/usr/bin/env python3
"""
Log Viewer for Atomic Notes API
View and filter logs with Request ID tracking
"""
import sys
import argparse
from datetime import datetime


def view_logs(log_file="server.log", request_id=None, level=None, tail=50):
    """View logs with optional filtering"""
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()
        
        # Get last N lines
        if tail:
            lines = lines[-tail:]
        
        # Filter by request_id if provided
        if request_id:
            lines = [line for line in lines if request_id in line]
        
        # Filter by log level if provided
        if level:
            level_upper = level.upper()
            lines = [line for line in lines if level_upper in line]
        
        # Print results
        if not lines:
            print("No matching log entries found.")
            return
        
        print(f"\n{'='*80}")
        print(f"Showing {len(lines)} log entries")
        print(f"{'='*80}\n")
        
        for line in lines:
            print(line.rstrip())
        
        print(f"\n{'='*80}")
        
    except FileNotFoundError:
        print(f"Error: Log file '{log_file}' not found.")
        print("\nThe API server might be outputting logs to stdout.")
        print("Try checking the terminal where you started the server.")
        sys.exit(1)


def search_errors(log_file="server.log", tail=100):
    """Search for error-related entries"""
    try:
        with open(log_file, 'r') as f:
            lines = f.readlines()[-tail:]
        
        error_keywords = ['ERROR', 'CRITICAL', 'Exception', 'Traceback', 'failed', 'Failed']
        error_lines = []
        
        for line in lines:
            if any(keyword in line for keyword in error_keywords):
                error_lines.append(line)
        
        if not error_lines:
            print("\n✅ No errors found in the last {} lines".format(tail))
            return
        
        print(f"\n{'='*80}")
        print(f"⚠️  Found {len(error_lines)} error-related entries")
        print(f"{'='*80}\n")
        
        for line in error_lines:
            print(line.rstrip())
        
        print(f"\n{'='*80}")
        
    except FileNotFoundError:
        print(f"Error: Log file '{log_file}' not found.")
        sys.exit(1)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="View Atomic Notes API logs")
    parser.add_argument("--file", "-f", default="server.log", help="Log file path")
    parser.add_argument("--request-id", "-r", help="Filter by Request ID")
    parser.add_argument("--level", "-l", help="Filter by log level (INFO, ERROR, etc.)")
    parser.add_argument("--tail", "-n", type=int, default=50, help="Number of lines to show")
    parser.add_argument("--errors", "-e", action="store_true", help="Show only errors")
    
    args = parser.parse_args()
    
    if args.errors:
        search_errors(args.file, args.tail)
    else:
        view_logs(args.file, args.request_id, args.level, args.tail)
