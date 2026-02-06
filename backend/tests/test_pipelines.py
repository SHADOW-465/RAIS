"""
RAIS Backend - Pipeline Tests
"""
import pytest
from pathlib import Path
from datetime import date

from app.pipelines.parser import (
    detect_file_type,
    excel_serial_to_date,
    score_row_as_header,
)
from app.models import FileType


class TestFileTypeDetection:
    """Test file type detection from filename"""
    
    def test_production_cumulative(self):
        assert detect_file_type("YEARLY PRODUCTION COMMULATIVE 2025-26.xlsx") == FileType.PRODUCTION_CUMULATIVE
    
    def test_cumulative(self):
        assert detect_file_type("COMMULATIVE 2025-26.xlsx") == FileType.CUMULATIVE
    
    def test_assembly(self):
        assert detect_file_type("ASSEMBLY REJECTION REPORT.xlsx") == FileType.ASSEMBLY
    
    def test_visual(self):
        assert detect_file_type("VISUAL INSPECTION REPORT 2025.xlsx") == FileType.VISUAL
    
    def test_integrity(self):
        assert detect_file_type("BALLOON & VALVE INTEGRITY INSPECTION REPORT FILE 2025.xlsx") == FileType.INTEGRITY
    
    def test_shopfloor(self):
        assert detect_file_type("SHOPFLOOR REJECTION REPORT.xlsx") == FileType.SHOPFLOOR
    
    def test_unknown(self):
        assert detect_file_type("random_file.xlsx") == FileType.UNKNOWN


class TestDateConversion:
    """Test Excel serial date conversion"""
    
    def test_valid_serial(self):
        # 45748 should be around April 2025
        result = excel_serial_to_date(45748)
        assert result is not None
        assert result.year == 2025
        assert result.month == 4
    
    def test_date_passthrough(self):
        d = date(2025, 4, 15)
        assert excel_serial_to_date(d) == d
    
    def test_string_date(self):
        result = excel_serial_to_date("April 2025")
        assert result is not None
        assert result.month == 4
    
    def test_invalid_serial(self):
        assert excel_serial_to_date(0) is None
        assert excel_serial_to_date(-1) is None


class TestHeaderScoring:
    """Test header row detection scoring"""
    
    def test_header_row_scores_high(self):
        header_row = ["S.NO", "DATE", "PRODUCTION QTY", "REJECTED QTY", "PERCENTAGE"]
        score = score_row_as_header(header_row)
        assert score > 20  # Should have high score
    
    def test_data_row_scores_low(self):
        data_row = [1, 45748, 1000, 50, 0.05]
        score = score_row_as_header(data_row)
        assert score < 10  # Should have low score
    
    def test_empty_row_scores_zero(self):
        assert score_row_as_header([]) == 0
        assert score_row_as_header([None, None, None]) == 0
