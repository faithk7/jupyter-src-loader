import importlib.util
import sys


def check_package(package_name):
    try:
        spec = importlib.util.find_spec(package_name)
        if spec is None:
            return None
        module = importlib.import_module(package_name)
        return module.__file__
    except ImportError:
        return None


if __name__ == "__main__":
    package_name = sys.argv[1]
    file_path = check_package(package_name)
    if (file_path is None) or ("anaconda3" not in file_path):
        print("True")
    else:
        print("False")
