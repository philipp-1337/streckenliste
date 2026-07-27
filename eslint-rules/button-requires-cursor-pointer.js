export default {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
  },

  create(context) {
    return {
      JSXOpeningElement(node) {
        if (node.name.name !== "button") return;

        const classAttr = node.attributes.find(
          (attr) =>
            attr.type === "JSXAttribute" &&
            attr.name.name === "className"
        );

        if (!classAttr?.value) return;

        if (classAttr.value.type === "Literal") {
          const value = classAttr.value.value;
          if (typeof value !== "string") return;
          if (value.includes("cursor-pointer")) return;

          context.report({
            node: classAttr,
            message: 'button must include "cursor-pointer" in className',
            fix(fixer) {
              return fixer.replaceText(
                classAttr.value,
                `"${value} cursor-pointer"`
              );
            },
          });
        } else if (classAttr.value.type === "JSXExpressionContainer") {
          const expr = classAttr.value.expression;
          if (expr.type === "TemplateLiteral") {
            const hasCursorPointer = expr.quasis.some(quasi =>
              quasi.value.raw.includes("cursor-pointer")
            );
            if (hasCursorPointer) return;

            context.report({
              node: classAttr,
              message: 'button must include "cursor-pointer" in className',
              fix(fixer) {
                const sourceCode = context.getSourceCode ? context.getSourceCode() : context.sourceCode;
                const templateText = sourceCode.getText(expr);
                // templateText is e.g. `flex ${active ? 'bg-red' : ''}`
                // we insert "cursor-pointer " right after the first backtick
                const newText = "{`cursor-pointer " + templateText.slice(1) + "}";
                return fixer.replaceText(classAttr.value, newText);
              },
            });
          }
        }
      },
    };
  },
};