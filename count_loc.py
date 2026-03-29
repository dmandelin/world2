import os
from collections import defaultdict

def count_lines_of_code():
    """
    Counts the number of files, lines, and characters for various file types
    in the current project directory, ignoring common non-project directories.
    """
    stats = defaultdict(lambda: {'files': 0, 'lines': 0, 'chars': 0})
    
    ignore_dirs = {'.git', 'node_modules', '.svelte-kit', 'build', 'dist', 'static'}
    
    # The user specifically mentioned these, but we will scan for all file types
    # and report on what we find.
    # included_suffixes = {'.md', '.ts', '.svelte'}

    for root, dirs, files in os.walk('.', topdown=True):
        # Exclude specified directories from traversal
        dirs[:] = [d for d in dirs if d not in ignore_dirs]
        
        for filename in files:
            try:
                # Get file extension
                suffix = os.path.splitext(filename)[1]
                if not suffix:
                    continue

                filepath = os.path.join(root, filename)
                
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                    lines = content.count('') + 1
                    chars = len(content)
                    
                    # Update stats
                    stats[suffix]['files'] += 1
                    stats[suffix]['lines'] += lines
                    stats[suffix]['chars'] += chars

            except Exception as e:
                print(f"Could not process file: {filepath} - {e}")

    return stats

def print_report(stats):
    """Prints a formatted report from the collected stats."""
    
    # Sort by number of lines in descending order
    sorted_stats = sorted(stats.items(), key=lambda item: item[1]['lines'], reverse=True)
    
    # Print header
    print(f"{'Suffix':<10} | {'# Files':>10} | {'# Lines':>12} | {'# Chars':>15}")
    print(f"{'-'*10:10} | {'-'*10:>10} | {'-'*12:>12} | {'-'*15:>15}")

    total_files = 0
    total_lines = 0
    total_chars = 0

    # Print rows
    for suffix, data in sorted_stats:
        files = data['files']
        lines = data['lines']
        chars = data['chars']
        total_files += files
        total_lines += lines
        total_chars += chars
        print(f"{suffix:<10} | {files:>10,d} | {lines:>12,d} | {chars:>15,d}")

    # Print footer
    print(f"{'-'*10:10} | {'-'*10:>10} | {'-'*12:>12} | {'-'*15:>15}")
    print(f"{'Total':<10} | {total_files:>10,d} | {total_lines:>12,d} | {total_chars:>15,d}")


if __name__ == "__main__":
    project_stats = count_lines_of_code()
    print_report(project_stats)
