#!/usr/bin/env python3
"""
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
 Description: A brief description of the file's purpose.
"""
from unittest import TestCase

from tree_sitter import Language, Parser
import tree_sitter_bsv


class TestLanguage(TestCase):
    def test_can_load_grammar(self):
        try:
            Parser(Language(tree_sitter_bsv.language()))
        except Exception:
            self.fail("Error loading Bsv grammar")
