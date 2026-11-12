.PHONY: run test seed
run:
	docker compose up --build
test:
	cd backend && python manage.py test
seed:
	cd backend && python manage.py seed_devices
