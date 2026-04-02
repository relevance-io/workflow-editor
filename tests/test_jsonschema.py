import os
import json
import sys
from jsonschema import validate, ValidationError


def validate_schema(file_path):
    with open(os.path.join(os.path.dirname(__file__), '..', 'schema.json'), 'r') as fp:
        schema = json.load(fp)

    try:
        with open(file_path, 'r') as f:
            data = json.load(f)

        validate(instance=data, schema=schema)
        print(f"Successfully validated {file_path}")
        return True
    except ValidationError as e:
        print(f"Validation failed: {e.message}")
        print(f"Path to error: {' -> '.join(map(str, e.absolute_path))}")
        return False
    except FileNotFoundError:
        print(f"Error: {file_path} not found.")
        return False


if __name__ == "__main__":
    try:
      exit_code = validate_schema(sys.argv[1])
    except IndexError:
        print(f'Usage: {sys.argv[0]} [json-file-to-test]')
        sys.exit(1)
    sys.exit(exit_code)
