/**
 * @license
 * Copyright 2017 Palantir Technologies, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as ts from "typescript";

import * as Lint from "../index";

const LINE_BREAK_REGEX = /\n|\r\n/;

export class Rule extends Lint.Rules.AbstractRule {
    /* tslint:disable:object-literal-sort-keys */
    public static metadata: Lint.IRuleMetadata = {
        ruleName: "import-spacing",
        description: "Ensures proper spacing between import statement keywords",
        optionsDescription: "Not configurable.",
        options: null,
        optionExamples: [true],
        type: "style",
        typescriptOnly: false,
    };

    public static ADD_SPACE_AFTER_IMPORT = "Add space after 'import'";
    public static TOO_MANY_SPACES_AFTER_IMPORT = "Too many spaces after 'import'";
    public static ADD_SPACE_AFTER_STAR = "Add space after '*'";
    public static TOO_MANY_SPACES_AFTER_STAR = "Too many spaces after '*'";
    public static ADD_SPACE_AFTER_FROM = "Add space after 'from'";
    public static TOO_MANY_SPACES_AFTER_FROM = "Too many spaces after 'from'";
    public static ADD_SPACE_BEFORE_FROM = "Add space before 'from'";
    public static TOO_MANY_SPACES_BEFORE_FROM = "Too many spaces before 'from'";
    public static NO_LINE_BREAKS = "Line breaks are not allowed in import declaration";

    public apply(sourceFile: ts.SourceFile): Lint.RuleFailure[] {
        const comparisonWalker = new ImportStatementWalker(sourceFile, this.getOptions());
        return this.applyWithWalker(comparisonWalker);
    }
}

class ImportStatementWalker extends Lint.RuleWalker {
    public visitImportDeclaration(node: ts.ImportDeclaration) {
        if (node.importClause === undefined) {
            this.checkModuleWithSideEffect(node);
        } else {
            const nodeStart = node.getStart();
            const importKeywordEnd = node.getStart() + "import".length;
            const moduleSpecifierStart = node.moduleSpecifier.getStart();
            const importClauseEnd = node.importClause.getEnd();
            const importClauseStart = node.importClause.getStart();

            if (importKeywordEnd === importClauseStart) {
                this.addFailureAt(nodeStart, "import".length, Rule.ADD_SPACE_AFTER_IMPORT);
            } else if (importClauseStart > (importKeywordEnd + 1)) {
                this.addFailureFromStartToEnd(nodeStart, importClauseStart, Rule.TOO_MANY_SPACES_AFTER_IMPORT);
            }

            const fromString = node.getText().substring(importClauseEnd - nodeStart, moduleSpecifierStart - nodeStart);

            if (/from$/.test(fromString)) {
                this.addFailureAt(importClauseEnd, fromString.length, Rule.ADD_SPACE_AFTER_FROM);
            } else if (/from\s{2,}$/.test(fromString)) {
                this.addFailureAt(importClauseEnd, fromString.length, Rule.TOO_MANY_SPACES_AFTER_FROM);
            }

            if (/^\s{2,}from/.test(fromString)) {
                this.addFailureAt(importClauseEnd, fromString.length, Rule.TOO_MANY_SPACES_BEFORE_FROM);
            } else if (/^from/.test(fromString)) {
                this.addFailureAt(importClauseEnd, fromString.length, Rule.ADD_SPACE_BEFORE_FROM);
            }

            const text = node.getText();
            const beforeImportClauseText = text.substring(0, importClauseStart - nodeStart);
            const afterImportClauseText = text.substring(importClauseEnd - nodeStart);
            if (LINE_BREAK_REGEX.test(beforeImportClauseText)) {
                this.addFailureFromStartToEnd(nodeStart, importClauseStart - 1, Rule.NO_LINE_BREAKS);
            }
            if (LINE_BREAK_REGEX.test(afterImportClauseText)) {
                this.addFailureFromStartToEnd(importClauseEnd, node.getEnd(), Rule.NO_LINE_BREAKS);
            }
        }
        super.visitImportDeclaration(node);
    }

    public visitNamespaceImport(node: ts.NamespaceImport) {
        const text = node.getText();
        if (text.indexOf("*as") > -1) {
            this.addFailureAtNode(node, Rule.ADD_SPACE_AFTER_STAR);
        } else if (/\*\s{2,}as/.test(text)) {
            this.addFailureAtNode(node, Rule.TOO_MANY_SPACES_AFTER_STAR);
        } else if (LINE_BREAK_REGEX.test(text)) {
            this.addFailureAtNode(node, Rule.NO_LINE_BREAKS);
        }
        super.visitNamespaceImport(node);
    }

    private checkModuleWithSideEffect(node: ts.ImportDeclaration) {
        const moduleSpecifierStart = node.moduleSpecifier.getStart();
        const nodeStart = node.getStart();

        if ((nodeStart + "import".length + 1) < moduleSpecifierStart) {
            this.addFailureFromStartToEnd(nodeStart, moduleSpecifierStart, Rule.TOO_MANY_SPACES_AFTER_IMPORT);
        } else if ((nodeStart + "import".length) === moduleSpecifierStart) {
            this.addFailureAt(nodeStart,  "import".length, Rule.ADD_SPACE_AFTER_IMPORT);
        }

        if (LINE_BREAK_REGEX.test(node.getText())) {
            this.addFailureAt(nodeStart, node.getWidth(), Rule.NO_LINE_BREAKS);
        }
    }
}
