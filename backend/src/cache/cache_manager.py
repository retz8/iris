import os
import json


class CacheManager:
    def __init__(self, cache_dir):
        self.cache_dir = cache_dir
        os.makedirs(self.cache_dir, exist_ok=True)

    def _get_cache_file_path(self, key):
        return os.path.join(self.cache_dir, f"{key}.json")

    def read_cache(self, key):
        cache_file_path = self._get_cache_file_path(key)
        if os.path.exists(cache_file_path):
            try:
                with open(cache_file_path, "r") as f:
                    return json.load(f)
            except (json.JSONDecodeError, IOError) as e:
                # Cache file is corrupted, remove it and return None (cache miss)
                try:
                    os.remove(cache_file_path)
                except OSError:
                    pass
                return None
        return None

    def write_cache(self, key, value):
        cache_file_path = self._get_cache_file_path(key)
        with open(cache_file_path, "w") as f:
            json.dump(value, f)

    def clear_cache(self, key):
        cache_file_path = self._get_cache_file_path(key)
        if os.path.exists(cache_file_path):
            os.remove(cache_file_path)

    def clear_all_cache(self):
        for filename in os.listdir(self.cache_dir):
            file_path = os.path.join(self.cache_dir, filename)
            if os.path.isfile(file_path):
                os.remove(file_path)
