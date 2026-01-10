def generate_cache_key(repo_owner, repo_name, file_path, commit_sha):
    return f"{repo_owner}_{repo_name}_{file_path}_{commit_sha}"


# Example usage
# key = generate_cache_key('owner', 'repo', 'path/to/file', 'commit_sha')
