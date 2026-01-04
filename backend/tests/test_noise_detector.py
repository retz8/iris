"""
Test suite for noise_detector.py
Tests noise detection across multiple languages and edge cases
"""

import sys
import os
import unittest

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.analyzer.noise_detector import detect_noise, _group_into_ranges, _classify_range


class TestJavaScriptNoiseDetection(unittest.TestCase):
    """Test noise detection in JavaScript/TypeScript code"""
    
    def test_react_component_with_error_handling(self):
        """Test React component with try-catch, console.log, and imports"""
        code = """import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UserProfile = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        console.log('Fetching user:', userId);
        const response = await axios.get(`/api/users/${userId}`);
        setUser(response.data);
      } catch (error) {
        console.error('Failed to fetch user:', error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    if (userId) {
      fetchUser();
    }
  }, [userId]);
  
  if (!user) return null;
  
  return (
    <div className="user-profile">
      <h2>{user.name}</h2>
      <p>{user.email}</p>
    </div>
  );
};

export default UserProfile;"""
        
        result = detect_noise(code, "javascript")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["language"], "javascript")
        
        # Should detect imports (lines 1-2)
        self.assertIn(1, result["noise_lines"])
        self.assertIn(2, result["noise_lines"])
        
        # Should detect try-catch (lines 10, 15, 18)
        self.assertIn(10, result["noise_lines"])
        self.assertIn(15, result["noise_lines"])
        self.assertIn(18, result["noise_lines"])
        
        # Should detect console.log (lines 12, 16)
        self.assertIn(12, result["noise_lines"])
        self.assertIn(16, result["noise_lines"])
        
        # Should detect export (line 38)
        self.assertIn(38, result["noise_lines"])
        
        # Should detect guard clause (line 28: if (!user) return null)
        self.assertIn(28, result["noise_lines"])
        
        # Verify noise percentage is reasonable (imports + error handling + logging)
        self.assertGreater(result["noise_percentage"], 15)
        self.assertLess(result["noise_percentage"], 40)
    
    def test_error_handling_patterns(self):
        """Test various JavaScript error handling patterns"""
        code = """
if (error) {
  throw new Error('Something failed');
}

promise.catch((err) => {
  console.error(err);
});

try {
  riskyOperation();
} catch (e) {
  handleError(e);
} finally {
  cleanup();
}
"""
        result = detect_noise(code, "javascript")
        
        self.assertTrue(result["success"])
        
        # Should detect error handling
        self.assertIn(2, result["noise_lines"])  # if (error)
        self.assertIn(3, result["noise_lines"])  # throw new Error
        self.assertIn(6, result["noise_lines"])  # .catch(
        self.assertIn(10, result["noise_lines"])  # try {
        self.assertIn(12, result["noise_lines"])  # } catch
        self.assertIn(14, result["noise_lines"])  # } finally
    
    def test_guard_clauses(self):
        """Test guard clause detection"""
        code = """
if (!user) return;
if (data === undefined) return null;
if (!isValid) {
  return false;
}

// Core logic
processData(data);
"""
        result = detect_noise(code, "javascript")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # if (!user) return
        self.assertIn(3, result["noise_lines"])  # if (data === undefined)
        self.assertIn(4, result["noise_lines"])  # if (!isValid) {
        
        # Core logic should NOT be noise
        self.assertNotIn(9, result["noise_lines"])


class TestPythonNoiseDetection(unittest.TestCase):
    """Test noise detection in Python code"""
    
    def test_fastapi_endpoint_with_error_handling(self):
        """Test FastAPI endpoint with logging and error handling"""
        code = """from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import logging

logger = logging.getLogger(__name__)

app = FastAPI()

class User(BaseModel):
    id: int
    name: str
    email: str

@app.get("/users/{user_id}")
async def get_user(user_id: int):
    try:
        logger.info(f"Fetching user {user_id}")
        
        if user_id <= 0:
            raise HTTPException(status_code=400, detail="Invalid user ID")
        
        user = await fetch_user_from_db(user_id)
        
        if user is None:
            raise HTTPException(status_code=404, detail="User not found")
        
        return user
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["language"], "python")
        
        # Should detect imports (lines 1-3)
        self.assertIn(1, result["noise_lines"])
        self.assertIn(2, result["noise_lines"])
        self.assertIn(3, result["noise_lines"])
        
        # Should detect try-except (lines 16, 29, 31)
        self.assertIn(16, result["noise_lines"])
        self.assertIn(29, result["noise_lines"])
        self.assertIn(31, result["noise_lines"])
        
        # Should detect logging (lines 17, 32)
        self.assertIn(17, result["noise_lines"])
        self.assertIn(32, result["noise_lines"])
        
        # Should detect raise statements (lines 20, 25, 33)
        self.assertIn(20, result["noise_lines"])
        self.assertIn(25, result["noise_lines"])
        self.assertIn(33, result["noise_lines"])
        
        # Should detect guards (line 24: if user is None)
        self.assertIn(24, result["noise_lines"])
        
        # Core logic should NOT be noise
        self.assertNotIn(22, result["noise_lines"])  # user = await fetch_user_from_db
    
    def test_python_error_handling_patterns(self):
        """Test Python-specific error handling"""
        code = """
try:
    result = risky_operation()
except ValueError:
    print("Value error occurred")
except Exception as e:
    logging.error(f"Error: {e}")
    raise ValueError("Custom error")
finally:
    cleanup()
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # try:
        self.assertIn(4, result["noise_lines"])  # except ValueError
        self.assertIn(5, result["noise_lines"])  # print
        self.assertIn(6, result["noise_lines"])  # except Exception
        self.assertIn(7, result["noise_lines"])  # logging.error
        self.assertIn(8, result["noise_lines"])  # raise ValueError
        self.assertIn(9, result["noise_lines"])  # finally:
    
    def test_python_imports(self):
        """Test Python import detection"""
        code = """import os
import sys
from pathlib import Path
from typing import List, Dict

def main():
    return "Hello"
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertIn(1, result["noise_lines"])
        self.assertIn(2, result["noise_lines"])
        self.assertIn(3, result["noise_lines"])
        self.assertIn(4, result["noise_lines"])
        self.assertNotIn(6, result["noise_lines"])  # def main()


class TestGoNoiseDetection(unittest.TestCase):
    """Test noise detection in Go code"""
    
    def test_go_http_handler_with_error_handling(self):
        """Test Go HTTP handler with typical error handling"""
        code = """package main

import (
    "encoding/json"
    "log"
    "net/http"
)

type User struct {
    ID    int    `json:"id"`
    Name  string `json:"name"`
    Email string `json:"email"`
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
    userID := r.URL.Query().Get("id")
    
    if userID == "" {
        http.Error(w, "Missing user ID", http.StatusBadRequest)
        return
    }
    
    user, err := fetchUserFromDB(userID)
    if err != nil {
        log.Printf("Error fetching user: %v", err)
        http.Error(w, "Internal server error", http.StatusInternalServerError)
        return
    }
    
    if user == nil {
        http.Error(w, "User not found", http.StatusNotFound)
        return
    }
    
    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}
"""
        result = detect_noise(code, "go")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["language"], "go")
        
        # Should detect imports (lines 3-7)
        self.assertIn(3, result["noise_lines"])
        
        # Should detect error handling (line 24: if err != nil)
        self.assertIn(24, result["noise_lines"])
        
        # Should detect logging (line 25: log.Printf)
        self.assertIn(25, result["noise_lines"])
        
        # Should detect guard clauses (line 30: if user == nil)
        self.assertIn(30, result["noise_lines"])  # if user == nil
        
        # Core logic should NOT be noise
        self.assertNotIn(23, result["noise_lines"])  # user, err := fetchUserFromDB
        self.assertNotIn(36, result["noise_lines"])  # json.NewEncoder
    
    def test_go_error_patterns(self):
        """Test various Go error handling patterns"""
        code = """
if err != nil {
    return err
}

if err == nil {
    log.Println("Success")
}

defer cleanup()

panic("Critical error")
"""
        result = detect_noise(code, "go")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # if err != nil
        self.assertIn(6, result["noise_lines"])  # if err == nil
        self.assertIn(7, result["noise_lines"])  # log.Println
        self.assertIn(10, result["noise_lines"])  # defer
        self.assertIn(12, result["noise_lines"])  # panic


class TestEdgeCases(unittest.TestCase):
    """Test edge cases and boundary conditions"""
    
    def test_empty_file(self):
        """Test with empty code"""
        result = detect_noise("", "javascript")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["noise_lines"], [])
        self.assertEqual(result["noise_ranges"], [])
        self.assertEqual(result["noise_percentage"], 0.0)
    
    def test_whitespace_only(self):
        """Test with only whitespace"""
        code = "\n\n   \n\t\n  "
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["noise_lines"], [])
        self.assertEqual(result["noise_percentage"], 0.0)
    
    def test_all_noise_file(self):
        """Test file with only noise (imports and logging)"""
        code = """import os
import sys
print("Debug 1")
print("Debug 2")
console.log("test");
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        # All non-empty lines should be noise
        self.assertEqual(len(result["noise_lines"]), 5)
        self.assertEqual(result["noise_percentage"], 100.0)
    
    def test_no_noise_file(self):
        """Test file with no noise (pure logic)"""
        code = """
def calculate_sum(a, b):
    return a + b

def multiply(x, y):
    result = x * y
    return result

total = calculate_sum(5, 3)
product = multiply(total, 2)
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["noise_lines"], [])
        self.assertEqual(result["noise_percentage"], 0.0)
    
    def test_unsupported_language(self):
        """Test with unsupported language"""
        code = "fn main() { println!(\"Hello\"); }"
        result = detect_noise(code, "rust")
        
        self.assertFalse(result["success"])
        self.assertIn("not yet supported", result["error"])
    
    def test_large_file(self):
        """Test with large file (1000+ lines)"""
        # Generate large file with mix of code and noise
        lines = []
        for i in range(1000):
            if i % 10 == 0:
                lines.append(f"console.log('Line {i}');")
            elif i % 15 == 0:
                lines.append("try {")
            elif i % 17 == 0:
                lines.append("} catch (e) {")
            else:
                lines.append(f"const value_{i} = processData({i});")
        
        code = "\n".join(lines)
        result = detect_noise(code, "javascript")
        
        self.assertTrue(result["success"])
        # Should handle large files without errors
        self.assertGreater(len(result["noise_lines"]), 0)
        self.assertLess(result["noise_percentage"], 100.0)
    
    def test_mixed_case_language_name(self):
        """Test language name normalization"""
        code = "const x = 1;"
        
        # All these should work
        for lang_variant in ["JavaScript", "JAVASCRIPT", "javascript", "  javascript  "]:
            result = detect_noise(code, lang_variant)
            self.assertTrue(result["success"])
            self.assertEqual(result["language"], "javascript")


class TestNoiseRangeGrouping(unittest.TestCase):
    """Test noise line grouping into ranges"""
    
    def test_consecutive_noise_grouping(self):
        """Test that consecutive noise lines are grouped into ranges"""
        code = """import os
import sys
import json

def main():
    return True
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        # Lines 1-3 should be grouped into one range
        self.assertTrue(any(
            r["start"] == 1 and r["end"] == 3 
            for r in result["noise_ranges"]
        ))
        
        # Should have type classification
        import_range = [r for r in result["noise_ranges"] if r["start"] == 1][0]
        self.assertEqual(import_range["type"], "imports")
    
    def test_non_consecutive_noise(self):
        """Test that non-consecutive noise creates separate ranges"""
        code = """import os

def process():
    try:
        work()
    except Exception:
        log.error("Failed")
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        # Should have at least 2 ranges (import and error handling)
        self.assertGreaterEqual(len(result["noise_ranges"]), 2)
    
    def test_mixed_noise_types_in_range(self):
        """Test range with multiple noise types"""
        code = """
try:
    log.info("Starting")
    result = operation()
except Exception as e:
    logger.error(e)
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        # Should classify based on priority (error_handling over logging)
        for r in result["noise_ranges"]:
            if "error_handling" in r["types"]:
                self.assertEqual(r["type"], "error_handling")


class TestRangeClassification(unittest.TestCase):
    """Test the _classify_range function"""
    
    def test_priority_order(self):
        """Test that noise types are prioritized correctly"""
        # error_handling has highest priority
        self.assertEqual(
            _classify_range(["logging", "error_handling", "imports"]),
            "error_handling"
        )
        
        # imports over logging
        self.assertEqual(
            _classify_range(["logging", "imports"]),
            "imports"
        )
        
        # guards lowest priority
        self.assertEqual(
            _classify_range(["guards"]),
            "guards"
        )
    
    def test_empty_types(self):
        """Test classification with empty types"""
        self.assertEqual(_classify_range([]), "unknown")
    
    def test_unknown_type(self):
        """Test classification with unknown type"""
        result = _classify_range(["custom_noise"])
        self.assertEqual(result, "custom_noise")


class TestNoisePercentageCalculation(unittest.TestCase):
    """Test noise percentage calculation accuracy"""
    
    def test_50_percent_noise(self):
        """Test file with exactly 50% noise"""
        code = """import os
const x = 1;
import sys
const y = 2;
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["noise_percentage"], 50.0)
    
    def test_rounding(self):
        """Test that percentage is rounded to 2 decimal places"""
        code = """import os
const a = 1;
const b = 2;
const c = 3;
const d = 4;
const e = 5;
const f = 6;
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        # 1 noise line out of 7 = 14.285714... should round to 14.29
        self.assertEqual(result["noise_percentage"], 14.29)


class TestLanguageSpecificPatterns(unittest.TestCase):
    """Test language-specific pattern matching"""
    
    def test_javascript_specific_patterns(self):
        """Test patterns unique to JavaScript"""
        code = """
const result = promise.catch(handleError);
export default MyComponent;
"""
        result = detect_noise(code, "javascript")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # .catch(
        self.assertIn(3, result["noise_lines"])  # export default
    
    def test_python_specific_patterns(self):
        """Test patterns unique to Python"""
        code = """
if user is None:
    raise ValueError("Invalid user")
"""
        result = detect_noise(code, "python")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # if ... is None
        self.assertIn(3, result["noise_lines"])  # raise
    
    def test_go_specific_patterns(self):
        """Test patterns unique to Go"""
        code = """
defer file.Close()
if err != nil {
    panic(err)
}
"""
        result = detect_noise(code, "go")
        
        self.assertTrue(result["success"])
        self.assertIn(2, result["noise_lines"])  # defer
        self.assertIn(3, result["noise_lines"])  # if err != nil
        self.assertIn(4, result["noise_lines"])  # panic


if __name__ == "__main__":
    # Run all tests with verbose output
    unittest.main(verbosity=2)
