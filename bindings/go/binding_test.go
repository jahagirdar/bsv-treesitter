/*
 Copyright: Copyright (c) 2025 Dyumnin Semiconductors. All rights reserved.
 Author: Vijayvithal <jahagirdar.vs@gmail.com>
 Created on: 2025-12-26
 Description: A brief description of the file's purpose.
*/
package tree_sitter_bsv_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_bsv "github.com/jahagirdar/bsv-treesitter.git/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_bsv.Language())
	if language == nil {
		t.Errorf("Error loading Bsv grammar")
	}
}
