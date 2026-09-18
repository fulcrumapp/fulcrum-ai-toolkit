import path from 'node:path';

import * as acorn from 'acorn';
import * as walk from 'acorn-walk';

const INSPECTED_DIRECTORIES = new Set(['examples', 'assets']);

export function isElementDiscriminatorContractPath(file, skillsDirectory) {
  const relative = path.relative(skillsDirectory, file);
  const segments = relative.split(path.sep);
  return segments.length >= 3 && segments[0] !== '..' && INSPECTED_DIRECTORIES.has(segments[1]);
}

function jsonContainsGenericElement(value) {
  if (Array.isArray(value)) return value.some(jsonContainsGenericElement);
  if (!value || typeof value !== 'object') return false;
  if (value.type === 'Element') return true;
  return Object.values(value).some(jsonContainsGenericElement);
}

function staticString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked;
  }
  if (node?.type === 'BinaryExpression' && node.operator === '+') {
    const left = staticString(node.left);
    const right = staticString(node.right);
    if (left !== undefined && right !== undefined) return left + right;
  }
  return undefined;
}

function propertyName(node) {
  if (!node.computed && node.key.type === 'Identifier') return node.key.name;
  return staticString(node.key);
}

function javascriptContainsGenericElement(source) {
  const tree = acorn.parse(source, { ecmaVersion: 'latest', sourceType: 'script' });
  let found = false;

  walk.simple(tree, {
    Property(node) {
      if (
        node.kind === 'init' &&
        propertyName(node) === 'type' &&
        staticString(node.value) === 'Element'
      ) {
        found = true;
      }
    }
  });

  return found;
}

export function containsGenericElementDiscriminator(source, extension) {
  if (extension === '.json') return jsonContainsGenericElement(JSON.parse(source));
  if (extension === '.js') return javascriptContainsGenericElement(source);
  return false;
}
