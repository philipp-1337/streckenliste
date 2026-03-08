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
        if (classAttr.value.type !== "Literal") return;

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
      },
    };
  },
};