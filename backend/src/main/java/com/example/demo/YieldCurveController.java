package com.example.demo;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Tag(name = "Yield curves")
@RestController
@RequestMapping("/yield-curves")
public class YieldCurveController {

    private final YieldCurveRepository yieldCurveRepository;

    public YieldCurveController(YieldCurveRepository yieldCurveRepository) {
        this.yieldCurveRepository = yieldCurveRepository;
    }

    // ---- stored curves (CRUD) ----

    @Operation(summary = "Save a yield curve")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public YieldCurve createCurve(@RequestBody YieldCurve request) {
        request.validatePoints();
        return yieldCurveRepository.save(request.copy());
    }

    @GetMapping
    public List<YieldCurve> getAllCurves() {
        return yieldCurveRepository.findAll();
    }

    @GetMapping("/{id}")
    public YieldCurve getCurve(@PathVariable Long id) {
        return findCurve(id);
    }

    @Transactional
    @PutMapping("/{id}")
    public YieldCurve updateCurve(@PathVariable Long id, @RequestBody YieldCurve request) {
        request.validatePoints();
        YieldCurve curve = findCurve(id);
        curve.setName(request.getName());
        // Mutate the managed collection in place (replacing it breaks orphanRemoval).
        curve.getPoints().clear();
        curve.getPoints().addAll(request.copy().getPoints());
        return yieldCurveRepository.save(curve);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteCurve(@PathVariable Long id) {
        yieldCurveRepository.delete(findCurve(id));
    }

    // ---- stateless transformations (nothing is saved) ----

    @Operation(summary = "Parallel shift of a curve by basisPoints (can be negative)")
    @PostMapping("/shift")
    public YieldCurve shift(@RequestParam double basisPoints, @RequestBody YieldCurve curve) {
        requireFinite(basisPoints);
        YieldCurve result = copyOf(curve);
        result.shiftParallel(basisPoints);
        result.validatePoints();
        return result;
    }

    @Operation(summary = "Steepen: long end up and short end down by basisPoints")
    @PostMapping("/steepen")
    public YieldCurve steepen(@RequestParam double basisPoints, @RequestBody YieldCurve curve) {
        requireFinite(basisPoints);
        YieldCurve result = copyOf(curve);
        result.steepenOrFlatten(Math.abs(basisPoints));
        result.validatePoints();
        return result;
    }

    @Operation(summary = "Flatten: long end down and short end up by basisPoints")
    @PostMapping("/flatten")
    public YieldCurve flatten(@RequestParam double basisPoints, @RequestBody YieldCurve curve) {
        requireFinite(basisPoints);
        YieldCurve result = copyOf(curve);
        result.steepenOrFlatten(-Math.abs(basisPoints));
        result.validatePoints();
        return result;
    }

    @Operation(summary = "Interpolated rate at a tenor for a curve supplied in the body")
    @PostMapping("/interpolate")
    public Map<String, Object> interpolate(@RequestParam double tenor, @RequestBody YieldCurve curve) {
        YieldCurve working = copyOf(curve);
        if (!Double.isFinite(tenor) || tenor <= 0.0) {
            throw new IllegalArgumentException("tenor must be finite and greater than 0");
        }
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("tenor", tenor);
        response.put("interpolatedRate", working.getRateAtTenor(tenor));
        return response;
    }

    private YieldCurve copyOf(YieldCurve curve) {
        curve.validatePoints();
        return curve.copy();
    }

    private void requireFinite(double basisPoints) {
        if (!Double.isFinite(basisPoints)) {
            throw new IllegalArgumentException("basisPoints must be finite");
        }
    }

    private YieldCurve findCurve(Long id) {
        return yieldCurveRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Yield curve not found"));
    }
}
