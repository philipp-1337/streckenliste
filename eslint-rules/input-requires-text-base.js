/**
 * Require text-base on input/select/textarea to prevent iOS auto-zoom (font < 16px triggers it).
 */
export default {
  meta: {
    type: "suggestion",
    fixable: "code",
    schema: [],
    messages: {
      missingTextBase:
        '{{tag}} must include "text-base" in className to prevent iOS auto-zoom',
    },
  },

  create(context) {
    const SKIP_TYPES = new Set(["checkbox", "radio", "hidden", "range", "color", "file"]);

    function getTypeAttr(node) {
      const typeAttr = node.attributes.find(
        (a) => a.type === "JSXAttribute" && a.name?.name === "type"
      );
      return typeAttr?.value?.value ?? null;
    }

    function classStringContainsTextBase(str) {
      return /\btext-base\b/.test(str);
    }

    function classNodeContainsTextBase(classAttr) {
      if (!classAttr?.value) return false;

      // className="..."
      if (classAttr.value.type === "Literal") {
        return classStringContainsTextBase(classAttr.value.value ?? "");
      }

      // className={...}
      if (classAttr.value.type === "JSXExpressionContainer") {
        const expr = classAttr.value.expression;

        // className={"..."}
        if (expr.type === "Literal") {
          return classStringContainsTextBase(expr.value ?? "");
        }

        // className={`... ${cond} ...`}
        if (expr.type === "TemplateLiteral") {
          return expr.quasis.some((q) =>
            classStringContainsTextBase(q.value.raw)
          );
        }
      }

      return false;
    }

    return {
      JSXOpeningElement(node) {
        const tagName = node.name?.name;
        if (!["input", "select", "textarea"].includes(tagName)) return;

        if (tagName === "input") {
          const inputType = getTypeAttr(node);
          if (inputType && SKIP_TYPES.has(inputType)) return;
        }

        const classAttr = node.attributes.find(
          (a) => a.type === "JSXAttribute" && a.name?.name === "className"
        );

        if (classNodeContainsTextBase(classAttr)) return;

        context.report({
          node: classAttr ?? node,
          messageId: "missingTextBase",
          data: { tag: tagName },
        });
      },
    };
  },
};
