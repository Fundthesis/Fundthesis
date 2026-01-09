"""LLM Schema Management Service.

Allows the LLM to modify the Prisma schema and run migrations safely.
Includes backup, validation, and rollback capabilities.
"""

import os
import shutil
import logging
import subprocess
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any, Optional, List

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Schema file paths
BACKEND_SCHEMA_PATH = Path(__file__).parent.parent / "schema.prisma"
FRONTEND_SCHEMA_PATH = Path(__file__).parent.parent.parent / "Frontend" / "prisma" / "schema.prisma"
BACKUP_DIR = Path(__file__).parent.parent / "schema_backups"

# Schema change history file
HISTORY_FILE = BACKUP_DIR / "change_history.json"


class SchemaManager:
    """Service for managing Prisma schema changes safely."""

    def __init__(self):
        """Initialize schema manager."""
        self.backend_schema = BACKEND_SCHEMA_PATH
        self.frontend_schema = FRONTEND_SCHEMA_PATH
        self.backup_dir = BACKUP_DIR

        # Ensure backup directory exists
        self.backup_dir.mkdir(parents=True, exist_ok=True)

    def _create_backup(self) -> str:
        """
        Create a timestamped backup of current schema files.

        Returns:
            Backup ID (timestamp string)
        """
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
        backup_subdir = self.backup_dir / timestamp
        backup_subdir.mkdir(parents=True, exist_ok=True)

        # Backup backend schema
        if self.backend_schema.exists():
            shutil.copy2(self.backend_schema, backup_subdir / "backend_schema.prisma")

        # Backup frontend schema
        if self.frontend_schema.exists():
            shutil.copy2(self.frontend_schema, backup_subdir / "frontend_schema.prisma")

        logging.info(f"[SchemaManager] Created backup: {timestamp}")
        return timestamp

    def _restore_backup(self, backup_id: str) -> bool:
        """
        Restore schema from a backup.

        Args:
            backup_id: Timestamp string of backup to restore

        Returns:
            True if successful, False otherwise
        """
        backup_subdir = self.backup_dir / backup_id

        if not backup_subdir.exists():
            logging.error(f"[SchemaManager] Backup not found: {backup_id}")
            return False

        try:
            backend_backup = backup_subdir / "backend_schema.prisma"
            frontend_backup = backup_subdir / "frontend_schema.prisma"

            if backend_backup.exists():
                shutil.copy2(backend_backup, self.backend_schema)

            if frontend_backup.exists():
                shutil.copy2(frontend_backup, self.frontend_schema)

            logging.info(f"[SchemaManager] Restored backup: {backup_id}")
            return True
        except Exception as e:
            logging.error(f"[SchemaManager] Error restoring backup: {e}")
            return False

    def _run_prisma_format(self) -> Dict[str, Any]:
        """
        Run 'prisma format' to validate and format the schema.

        Returns:
            Dict with success status and output
        """
        try:
            # Format backend schema
            result = subprocess.run(
                ["npx", "prisma", "format", f"--schema={self.backend_schema}"],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Schema format validation failed",
                    "output": result.stdout
                }

            return {
                "success": True,
                "output": result.stdout or "Schema formatted successfully"
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Prisma format command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "Prisma CLI not found. Ensure npx/prisma is installed."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _run_prisma_validate(self) -> Dict[str, Any]:
        """
        Run 'prisma validate' to check schema validity.

        Returns:
            Dict with success status and output
        """
        try:
            result = subprocess.run(
                ["npx", "prisma", "validate", f"--schema={self.backend_schema}"],
                capture_output=True,
                text=True,
                timeout=30
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Schema validation failed",
                    "output": result.stdout
                }

            return {
                "success": True,
                "output": result.stdout or "Schema is valid"
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Prisma validate command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "Prisma CLI not found. Ensure npx/prisma is installed."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _run_prisma_db_push(self, skip_generate: bool = False) -> Dict[str, Any]:
        """
        Run 'prisma db push' to apply schema changes to database.

        Args:
            skip_generate: If True, skip client generation

        Returns:
            Dict with success status and output
        """
        try:
            cmd = ["npx", "prisma", "db", "push", f"--schema={self.backend_schema}", "--accept-data-loss"]
            if skip_generate:
                cmd.append("--skip-generate")

            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=120
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Database push failed",
                    "output": result.stdout
                }

            return {
                "success": True,
                "output": result.stdout or "Database schema updated successfully"
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Prisma db push command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "Prisma CLI not found. Ensure npx/prisma is installed."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _run_prisma_generate(self) -> Dict[str, Any]:
        """
        Run 'prisma generate' to regenerate the Prisma client.

        Returns:
            Dict with success status and output
        """
        try:
            result = subprocess.run(
                ["npx", "prisma", "generate", f"--schema={self.backend_schema}"],
                capture_output=True,
                text=True,
                timeout=60
            )

            if result.returncode != 0:
                return {
                    "success": False,
                    "error": result.stderr or "Client generation failed",
                    "output": result.stdout
                }

            return {
                "success": True,
                "output": result.stdout or "Prisma client generated successfully"
            }
        except subprocess.TimeoutExpired:
            return {"success": False, "error": "Prisma generate command timed out"}
        except FileNotFoundError:
            return {"success": False, "error": "Prisma CLI not found. Ensure npx/prisma is installed."}
        except Exception as e:
            return {"success": False, "error": str(e)}

    def _sync_frontend_schema(self) -> Dict[str, Any]:
        """
        Sync backend schema changes to frontend schema.
        Only syncs model definitions, preserving frontend-specific generator config.

        Returns:
            Dict with success status
        """
        try:
            if not self.backend_schema.exists():
                return {"success": False, "error": "Backend schema not found"}

            # Read backend schema
            with open(self.backend_schema, 'r') as f:
                backend_content = f.read()

            # Read frontend schema to get generator config
            if self.frontend_schema.exists():
                with open(self.frontend_schema, 'r') as f:
                    frontend_content = f.read()

                # Extract frontend generator config (preserve it)
                # Find generator block
                import re
                frontend_generator = re.search(r'generator\s+client\s*\{[^}]+\}', frontend_content)
                if frontend_generator:
                    # Replace backend generator with frontend generator
                    backend_generator = re.search(r'generator\s+client\s*\{[^}]+\}', backend_content)
                    if backend_generator:
                        # Create frontend version with its own generator
                        frontend_new = backend_content.replace(
                            backend_generator.group(0),
                            frontend_generator.group(0)
                        )
                        with open(self.frontend_schema, 'w') as f:
                            f.write(frontend_new)
                        return {"success": True, "message": "Frontend schema synced"}

            # If no frontend schema exists, just copy backend (user will need to update generator)
            shutil.copy2(self.backend_schema, self.frontend_schema)
            return {"success": True, "message": "Frontend schema created from backend"}

        except Exception as e:
            logging.error(f"[SchemaManager] Error syncing frontend schema: {e}")
            return {"success": False, "error": str(e)}

    def _log_change(self, change_type: str, details: Dict[str, Any], backup_id: str, success: bool):
        """Log a schema change to history file."""
        try:
            history = []
            if HISTORY_FILE.exists():
                with open(HISTORY_FILE, 'r') as f:
                    history = json.load(f)

            history.append({
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "change_type": change_type,
                "details": details,
                "backup_id": backup_id,
                "success": success
            })

            # Keep last 100 entries
            history = history[-100:]

            with open(HISTORY_FILE, 'w') as f:
                json.dump(history, f, indent=2)

        except Exception as e:
            logging.error(f"[SchemaManager] Error logging change: {e}")

    def get_current_schema(self) -> Dict[str, Any]:
        """
        Read and return the current schema content.

        Returns:
            Dict with schema content and metadata
        """
        try:
            if not self.backend_schema.exists():
                return {"success": False, "error": "Schema file not found"}

            with open(self.backend_schema, 'r') as f:
                content = f.read()

            return {
                "success": True,
                "schema": content,
                "path": str(self.backend_schema)
            }
        except Exception as e:
            return {"success": False, "error": str(e)}

    def get_change_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        """
        Get recent schema change history.

        Args:
            limit: Maximum number of entries to return

        Returns:
            List of change history entries
        """
        try:
            if not HISTORY_FILE.exists():
                return []

            with open(HISTORY_FILE, 'r') as f:
                history = json.load(f)

            return history[-limit:]
        except Exception as e:
            logging.error(f"[SchemaManager] Error reading history: {e}")
            return []

    def list_backups(self) -> List[Dict[str, Any]]:
        """
        List available backups.

        Returns:
            List of backup info dictionaries
        """
        backups = []
        try:
            for item in sorted(self.backup_dir.iterdir(), reverse=True):
                if item.is_dir() and item.name != "__pycache__":
                    backups.append({
                        "id": item.name,
                        "path": str(item),
                        "has_backend": (item / "backend_schema.prisma").exists(),
                        "has_frontend": (item / "frontend_schema.prisma").exists()
                    })
        except Exception as e:
            logging.error(f"[SchemaManager] Error listing backups: {e}")

        return backups[:20]  # Return last 20 backups

    async def apply_schema_change(
        self,
        new_schema_content: str,
        change_description: str,
        auto_push: bool = False,
        sync_frontend: bool = True
    ) -> Dict[str, Any]:
        """
        Apply a schema change safely with backup and validation.

        Args:
            new_schema_content: The new complete Prisma schema content
            change_description: Description of what changed
            auto_push: If True, automatically run 'prisma db push'
            sync_frontend: If True, sync changes to frontend schema

        Returns:
            Dict with success status and details
        """
        # Step 1: Create backup
        backup_id = self._create_backup()
        logging.info(f"[SchemaManager] Backup created: {backup_id}")

        try:
            # Step 2: Write new schema
            with open(self.backend_schema, 'w') as f:
                f.write(new_schema_content)
            logging.info("[SchemaManager] New schema written")

            # Step 3: Validate with prisma format
            format_result = self._run_prisma_format()
            if not format_result.get("success"):
                # Restore backup on validation failure
                self._restore_backup(backup_id)
                self._log_change("schema_update", {"description": change_description}, backup_id, False)
                return {
                    "success": False,
                    "error": f"Schema format failed: {format_result.get('error')}",
                    "backup_id": backup_id,
                    "rolled_back": True
                }

            # Step 4: Validate schema
            validate_result = self._run_prisma_validate()
            if not validate_result.get("success"):
                # Restore backup on validation failure
                self._restore_backup(backup_id)
                self._log_change("schema_update", {"description": change_description}, backup_id, False)
                return {
                    "success": False,
                    "error": f"Schema validation failed: {validate_result.get('error')}",
                    "backup_id": backup_id,
                    "rolled_back": True
                }

            logging.info("[SchemaManager] Schema validated successfully")

            # Step 5: Sync to frontend if requested
            if sync_frontend:
                sync_result = self._sync_frontend_schema()
                if not sync_result.get("success"):
                    logging.warning(f"[SchemaManager] Frontend sync warning: {sync_result.get('error')}")

            # Step 6: Push to database if auto_push is enabled
            push_result = None
            if auto_push:
                push_result = self._run_prisma_db_push()
                if not push_result.get("success"):
                    # Restore backup on push failure
                    self._restore_backup(backup_id)
                    self._log_change("schema_update", {"description": change_description}, backup_id, False)
                    return {
                        "success": False,
                        "error": f"Database push failed: {push_result.get('error')}",
                        "backup_id": backup_id,
                        "rolled_back": True
                    }

                # Step 7: Regenerate Prisma client
                generate_result = self._run_prisma_generate()
                if not generate_result.get("success"):
                    logging.warning(f"[SchemaManager] Client generation warning: {generate_result.get('error')}")

            # Log successful change
            self._log_change("schema_update", {"description": change_description}, backup_id, True)

            return {
                "success": True,
                "message": "Schema updated successfully",
                "backup_id": backup_id,
                "validation": "passed",
                "pushed_to_db": auto_push,
                "synced_to_frontend": sync_frontend
            }

        except Exception as e:
            # Restore backup on any error
            self._restore_backup(backup_id)
            self._log_change("schema_update", {"description": change_description, "error": str(e)}, backup_id, False)
            logging.error(f"[SchemaManager] Error applying schema change: {e}")
            return {
                "success": False,
                "error": str(e),
                "backup_id": backup_id,
                "rolled_back": True
            }

    async def rollback_to_backup(self, backup_id: str) -> Dict[str, Any]:
        """
        Rollback schema to a previous backup.

        Args:
            backup_id: ID of backup to restore

        Returns:
            Dict with success status
        """
        # Create a backup of current state first
        current_backup = self._create_backup()

        success = self._restore_backup(backup_id)
        if success:
            self._log_change("rollback", {"restored_from": backup_id}, current_backup, True)
            return {
                "success": True,
                "message": f"Rolled back to backup {backup_id}",
                "pre_rollback_backup": current_backup
            }
        else:
            return {
                "success": False,
                "error": f"Failed to restore backup {backup_id}"
            }

    async def push_current_schema(self) -> Dict[str, Any]:
        """
        Push current schema to database without changes.

        Returns:
            Dict with success status
        """
        # Create backup first
        backup_id = self._create_backup()

        push_result = self._run_prisma_db_push()
        if not push_result.get("success"):
            return {
                "success": False,
                "error": push_result.get("error"),
                "backup_id": backup_id
            }

        generate_result = self._run_prisma_generate()

        self._log_change("db_push", {}, backup_id, True)

        return {
            "success": True,
            "message": "Schema pushed to database",
            "backup_id": backup_id,
            "client_generated": generate_result.get("success", False)
        }


# Singleton instance
_schema_manager: Optional[SchemaManager] = None


def get_schema_manager() -> SchemaManager:
    """Get or create the schema manager singleton."""
    global _schema_manager
    if _schema_manager is None:
        _schema_manager = SchemaManager()
    return _schema_manager
